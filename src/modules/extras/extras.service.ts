import { Injectable } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExtraDto } from './dto/create-reviews.dto';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { MessageGateway } from 'src/modules/chat/message/message.gateway';

@Injectable()
export class ExtrasService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}
  async createReport(
    createReportDTO: CreateReportDto,
    reporterId: string,
    reportedId: string,
  ) {
    try {
      //students cannot report themselves
      if (reporterId === reportedId) {
        throw new Error('You cannot report yourself');
      }

      //same user.type cannot report each other
      const reporter = await this.prismaService.user.findUnique({
        where: { id: reporterId },
      });
      const reported = await this.prismaService.user.findUnique({
        where: { id: reportedId },
      });
      if (reporter.type === reported.type) {
        throw new Error('You cannot report a user of the same type');
      }

      //students can rport only those teaher who have taken their sessions
      if (reporter.type === 'student' && reported.type === 'teacher') {
        const sessions = await this.prismaService.book_Session.findMany({
          where: {
            user_id: reporterId,
          },
          select: {
            create_session: {
              where: { user_id: reportedId },
            },
          },
        });

        if (sessions.length === 0) {
          throw new Error(
            'You can report only those teachers who have taken your sessions',
          );
        }
      }

      //techers can report only those students who have attended their sessions
      if (reporter.type === 'teacher' && reported.type === 'student') {
        const sessions = await this.prismaService.book_Session.findMany({
          where: {
            user_id: reportedId,
          },
          select: {
            create_session: {
              where: { user_id: reporterId },
            },
          },
        });
        if (sessions.length === 0) {
          throw new Error(
            'You can report only those students who have attended your sessions',
          );
        }
      }

      const report = await this.prismaService.report.create({
        data: {
          reason: createReportDTO.reason,
          description: createReportDTO.description,
          reporter_id: reporterId,
          reported_id: reportedId,
        },
      });

      // report notification for admin
      const admins = await this.prismaService.user.findMany({
        where: { type: 'admin' },
      });

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          const adminNotificationPayload: any = {
            sender_id: reporterId,
            receiver_id: admin.id,
            text: `A new report has been filed by ${reporterId} against ${reportedId} for: ${createReportDTO.reason}`,
            type: 'new_report',
          };

          NotificationRepository.createNotification(adminNotificationPayload);

          const userSocketId = this.messageGateway.clients.get(admin.id);

          if (userSocketId) {
            this.messageGateway.server
              .to(userSocketId)
              .emit('notification', adminNotificationPayload);
            console.log(`Notification sent to user ${admin.id}`);
          } else {
            console.log(
              `User ${admin.id} is not connected, notification will be sent later.`,
            );
          }
        }
      }

      return report;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  //give rating to a teacher
  async giveRatingToTeaher(
    createRivewDTO: CreateExtraDto,
    studentId: string,
    sessionId: string,
  ) {
    const session = await this.prismaService.book_Session.findUnique({
      where: { id: sessionId },
      select: { is_completed: true, is_joined: true },
    });
    if (!session || session.is_completed === 0) {
      throw new Error('You can rate only completed sessions');
    }

    if (session.is_joined === 0) {
      throw new Error('You can rate only sessions which you have joined');
    }

    const existingReview = await this.prismaService.rate_Session.findFirst({
      where: {
        user_id: studentId,
        book_session_id: sessionId,
      },
    });
    if (existingReview) {
      throw new Error('You have already given a review for this session');
    }

    //students can give rating only to those teachers who have taken their sessions
    const bookedSession = await this.prismaService.book_Session.findUnique({
      where: { id: sessionId },
      select: { user_id: true },
    });
    if (!bookedSession && bookedSession.user_id !== studentId) {
      return {
        message:
          'You can give rating only to those teachers who have taken your sessions',
      };
    }

    const review = await this.prismaService.rate_Session.create({
      data: {
        rating: createRivewDTO.rating,
        comment: createRivewDTO.comment,
        user_id: studentId,
        book_session_id: sessionId,
      },
    });
    return review;
  }
}
