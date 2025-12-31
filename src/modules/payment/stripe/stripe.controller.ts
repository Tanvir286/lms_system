import {
  Controller,
  Post,
  Req,
  Headers,
  UseGuards,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { StripeService } from './stripe.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { TransactionRepository } from '../../../common/repository/transaction/transaction.repository';
import { stat } from 'fs';

@Controller('payment/stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);
  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
  ) { }

  // @Post('pay')
  // @UseGuards(JwtAuthGuard)
  // async pay(
  //   @Body() body: { amount?: number; currency?: string; payment_method: string },
  //   @Req() req: Request & { user: { userId: string } },
  // ) {
  //   try {
  //     const userId = req.user?.userId;

  //     if (!userId) {
  //       throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
  //     }

  //     const user = await this.prisma.user.findUnique({
  //       where: { id: userId },
  //       select: {
  //         email: true,
  //         billing_id: true,
  //         Book_Sessions: {
  //           select: {
  //             id: true,
  //             payment_status: true,
  //             transaction_id: true,
  //             create_session: {
  //               select: {
  //                 id: true,
  //                 user_id: true,
  //                 session_charge: true,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     });

  //     if (!user || !user.Book_Sessions || user.Book_Sessions.length === 0) {
  //      return {
  //       status: HttpStatus.BAD_REQUEST,
  //       message: 'No booking sessions found for user',
  //      }
  //     }

  //     // Find the first unpaid session
  //     const session = user.Book_Sessions.find(s => s.payment_status !== 'paid');
  //     if (!session) {
  //     return {
  //       status: HttpStatus.BAD_REQUEST,
  //       message: 'All booking sessions are already paid'}
  //     }

  //     const amount = Number(session.create_session?.session_charge || body.amount);
  //     if (isNaN(amount) || amount <= 0) {
  //       return{
  //         status: HttpStatus.BAD_REQUEST,
  //         message: 'Invalid amount for payment',
  //       }
  //     }

  //     // Create payment intent
  //     const payment = await StripePayment.createPaymentIntent({
  //       amount,
  //       currency: body.currency || 'usd',
  //       customer_id: user.billing_id,
  //       metadata: {
  //         userId,
  //         sessionId: session.id,
  //       },
  //     });

  //     console.log(payment);


  //     this.logger.log(`PaymentIntent Created: ${payment.client_secret}`);
  //     this.logger.debug(`Metadata: ${JSON.stringify(payment.metadata)}`);

  //     return {
  //       clientSecret: payment.client_secret,
  //       msg: 'PaymentIntent created successfully',
  //       amount: payment.amount,
  //     };
  //   } catch (error) {
  //     this.logger.error('Error creating PaymentIntent', error.stack);
  //     throw new HttpException(
  //       {
  //         statusCode: 500,
  //         message: 'Error creating payment',
  //         error: error.message,
  //       },
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  @Post('pay')
  @UseGuards(JwtAuthGuard)
  async pay(
    @Body() body: { amount?: number; currency?: string; paymentMethodId: string },
    @Req() req: Request & { user: { userId: string } },
  ) {
    const userId = req.user?.userId;

    if (!userId) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }

    if (!body.paymentMethodId) {
      throw new HttpException('paymentMethodId is required', HttpStatus.BAD_REQUEST); 
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          billing_id: true,
          Book_Sessions: {
            select: {
              id: true,
              payment_status: true,
              transaction_id: true,
              create_session: {
                select: {
                  id: true,
                  user_id: true,
                  session_charge: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const bookingSession = user.Book_Sessions.find(
        (session) => session.payment_status !== 'paid',
      );

      if (!bookingSession) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'All booking sessions are already paid',
        };
      }

      // Set the amount from session or fallback to the amount in the body
      const amount = Number(
        bookingSession.create_session?.session_charge,
      );

      if (isNaN(amount) || amount <= 0) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid payment amount. Please check your booking.',
        };
      }

      const currency = body.currency || 'usd';

      const payment = await StripePayment.createPaymentIntent({
        payment_method_id: body.paymentMethodId,
        amount,
        currency,
        customer_id: user.billing_id,
        metadata: {
          userId,
          sessionId: bookingSession.id,
        },
      });

      this.logger.log(`PaymentIntent Created: ${payment.client_secret}`);
      this.logger.debug(`Metadata: ${JSON.stringify(payment.metadata)}`);

      return {
        status: HttpStatus.OK,
        clientSecret: payment.client_secret,
        message: 'PaymentIntent created successfully',
        amount: payment.amount,
      };
    } catch (error) {
      this.logger.error('Error creating PaymentIntent', error.stack);

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error creating payment',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request & { rawBody: Buffer },
  ) {
    try {
      const payload = req.rawBody.toString();

      const event = await this.stripeService.handleWebhook(payload, signature);

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;

          await this.prisma.book_Session.update({
            where: { id: paymentIntent.metadata['sessionId'] },
            data: { payment_status: 'paid' },
          });

          await TransactionRepository.updateTransaction({
            reference_number: paymentIntent.id,
            status: 'succeeded',
            paid_amount: paymentIntent.amount / 100,
            paid_currency: paymentIntent.currency,
            raw_status: paymentIntent.status,
          });

          break;
        }

        case 'payment_intent.payment_failed': {
          const failedPaymentIntent = event.data.object;

          await TransactionRepository.updateTransaction({
            reference_number: failedPaymentIntent.id,
            status: 'failed',
            raw_status: failedPaymentIntent.status,
          });

          break;
        }

        case 'payment_intent.canceled': {
          const canceledPaymentIntent = event.data.object;

          await TransactionRepository.updateTransaction({
            reference_number: canceledPaymentIntent.id,
            status: 'canceled',
            raw_status: canceledPaymentIntent.status,
          });

          break;
        }

        case 'payment_intent.requires_action': {
          const requireActionPaymentIntent = event.data.object;

          await TransactionRepository.updateTransaction({
            reference_number: requireActionPaymentIntent.id,
            status: 'requires_action',
            raw_status: requireActionPaymentIntent.status,
          });

          break;
        }

        case 'payout.paid': {
          const paidPayout = event.data.object;
          this.logger.log(`Payout paid: ${JSON.stringify(paidPayout)}`);
          break;
        }

        case 'payout.failed': {
          const failedPayout = event.data.object;
          this.logger.warn(`Payout failed: ${JSON.stringify(failedPayout)}`);
          break;
        }

        default:
          this.logger.warn(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook error', error.stack);
      return { received: false };
    }
  }
}
