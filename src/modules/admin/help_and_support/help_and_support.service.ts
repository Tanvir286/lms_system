import { Injectable } from '@nestjs/common';
import { CreateHelpAndSupportDto } from './dto/create-help_and_support.dto';
import { UpdateHelpAndSupportDto } from './dto/update-help_and_support.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { MessageGateway } from 'src/modules/chat/message/message.gateway';

@Injectable()
export class HelpAndSupportService {
  constructor(
    private prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}

  async createSupport(
    createHelpAndSupportDto: CreateHelpAndSupportDto,
    // userId: string,
  ) {
    const { full_name, email, subject, message } = createHelpAndSupportDto;
    await this.prisma.helpAndSupport.create({
      data: {
        full_name,
        email,
        subject,
        message,
        // user_id: userId,
      },
    });

    const admins = await this.prisma.user.findMany({
      where: { type: 'admin' },
    });

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        const adminNotificationPayload: any = {
          sender_id: '',
          receiver_id: admin.id,
          text: `A new contact message has been received. Subject: ${subject} from ${full_name} email: ${email} `,
          type: 'contact_message',
        };

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

        NotificationRepository.createNotification(adminNotificationPayload);
      }
    }
    return {
      success: true,
      message: 'Help and support message created successfully.',
    };
  }
  async getAllSupport() {
    const allMessages = await this.prisma.helpAndSupport.findMany();
    return {
      success: true,
      message: 'Help and support messages fetched successfully.',
      data: allMessages,
    };
  }

  async getOneSupport(id: string) {
    const message = await this.prisma.helpAndSupport.findUnique({
      where: { id },
    });
    if (!message) {
      return {
        success: false,
        message: 'Message not found',
      };
    }
    return {
      success: true,
      message: 'Help and support message fetched successfully.',
      data: message,
    };
  }

  async toggleSupportStatus(id: string) {
    const message = await this.prisma.helpAndSupport.findUnique({
      where: { id },
      select: {
        status: true,
        user_id: true,
      },
    });

    if (message.status === 'unsolved') {
      await this.prisma.helpAndSupport.update({
        where: { id },
        data: { status: 'solved' },
      });
    } else {
      await this.prisma.helpAndSupport.update({
        where: { id },
        data: { status: 'unsolved' },
      });
    }

    const supportUserNotificationPayload: any = {
      sender_id: '',
      receiver_id: message.user_id,
      text: `Your help and support message status has been updated to ${message.status}.`,
      type: 'help_and_support_status_updated',
    };

    const userSocketId = this.messageGateway.clients.get(message.user_id);

    if (userSocketId) {
      this.messageGateway.server
        .to(userSocketId)
        .emit('notification', supportUserNotificationPayload);
      console.log(`Notification sent to user ${message.user_id}`);
    } else {
      console.log(
        `User ${message.user_id} is not connected, notification will be sent later.`,
      );
    }

    NotificationRepository.createNotification(supportUserNotificationPayload);

    return {
      success: true,
      message: 'Help and support message status updated successfully.',
      data: message,
    };
  }

  // report section

  async getAllreports() {
    try {
      const reports = await this.prisma.report.findMany({});
      return {
        success: true,
        data: reports,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error fetching reports',
      };
    }
  }
}
