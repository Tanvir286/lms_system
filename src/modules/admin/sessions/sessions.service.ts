import { Injectable } from '@nestjs/common';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageGateway } from 'src/modules/chat/message/message.gateway';

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}

  async getAllSessions() {
    try {
      const defaultDuration = '60min';

      const sessions = await this.prisma.create_Session.findMany({
        select: {
          id: true,
          subject: true,
          status: true,
          session_charge: true,
          available_slots_time_and_date: true,
          user: {
            select: {
              name: true,
            },
          },
          Book_Session: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      const sessionsWithDuration = sessions.map((session) => ({
        id: session.id,
        subject: session.subject,
        status: session.status,
        session_charge: session.session_charge,
        available_slots_time_and_date: session.available_slots_time_and_date,
        tutor_name: session.user ? session.user.name : 'Unknown',
        duration: defaultDuration,
        Book_Session: session.Book_Session.map((booking) => ({
          name: booking.user ? booking.user.name : 'Unknown',
        })),
      }));

      return {
        success: true,
        message: 'Sessions fetched successfully.',
        data: sessionsWithDuration,
      };
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return {
        statusCode: 500,
        success: false,
        message: 'An error occurred while fetching sessions.',
        error: error.message,
      };
    }
  }
  async restrictAsession(id: string, reason: string) {
    try {
      const session = await this.prisma.create_Session.findUnique({
        where: { id },
      });

      if (!session) {
        return {
          success: false,
          message: 'Session not found.',
        };
      }
      if (session.is_restricted == 1) {
        return {
          success: false,
          message: 'Already restricted.',
        };
      }

      await this.prisma.create_Session.update({
        where: { id },
        data: {
          is_restricted: 1,
          restriction_reason: reason,
        },
      });

      // restrict session notification
      const teacherSessionNotificationPayload: any = {
        sender_id: '',
        receiver_id: session.user_id,
        text: `Your session with Subject Name: ${session.subject} has been restricted. Reason: ${reason}`,
        type: 'session_restriction',
      };

      NotificationRepository.createNotification(
        teacherSessionNotificationPayload,
      );

      const userSocketId = this.messageGateway.clients.get(session.user_id);

      if (userSocketId) {
        this.messageGateway.server
          .to(userSocketId)
          .emit('notification', teacherSessionNotificationPayload);
        console.log(`Notification sent to user ${session.user_id}`);
      } else {
        console.log(
          `User ${session.user_id} is not connected, notification will be sent later.`,
        );
      }

      return {
        success: true,
        message: 'Session restricted successfully.',
      };
    } catch (error) {
      console.error('Error restricting session:', error);
      return {
        statusCode: 500,
        success: false,
        message: 'An error occurred while restricting the session.',
        error: error.message,
      };
    }
  }
  async unRestrictAsession(id: string) {
    try {
      const session = await this.prisma.create_Session.findUnique({
        where: { id },
      });
      if (!session) {
        return {
          success: false,
          message: 'Session not found.',
        };
      }
      if (session.is_restricted == 0) {
        return {
          success: false,
          message: 'Session is not restricted.',
        };
      }

      await this.prisma.create_Session.update({
        where: { id },
        data: {
          is_restricted: 0,
          restriction_reason: null,
        },
      });
      // unrestrict session notification
      const adminNotificationPayload: any = {
        sender_id: '',
        receiver_id: session.user_id,
        text: `Your session with Subject Name: ${session.subject} has been unrestricted.`,
        type: 'session_unrestriction',
      };

      NotificationRepository.createNotification(adminNotificationPayload);

      const userSocketId = this.messageGateway.clients.get(session.user_id);

      if (userSocketId) {
        this.messageGateway.server
          .to(userSocketId)
          .emit('notification', adminNotificationPayload);
        console.log(`Notification sent to user ${session.user_id}`);
      } else {
        console.log(
          `User ${session.user_id} is not connected, notification will be sent later.`,
        );
      }

      return {
        success: true,
        message: 'Session unrestricted successfully.',
      };
    } catch (error) {
      console.error('Error unrestricting session:', error);
      return {
        statusCode: 500,
        success: false,
        message: 'An error occurred while unrestricting the session.',
        error: error.message,
      };
    }
  }

  async deleteSession(id: string) {
    try {
      const session = await this.prisma.create_Session.findUnique({
        where: { id },
      });
      if (!session) {
        return {
          success: false,
          message: 'Session not found.',
        };
      }
      await this.prisma.create_Session.delete({
        where: { id },
      });
      return {
        success: true,
        message: 'Session deleted successfully.',
      };
    } catch (error) {
      console.error('Error deleting session:', error);
      return {
        statusCode: 500,
        success: false,
        message: 'An error occurred while deleting the session.',
        error: error.message,
      };
    }
  }

  // Get all session states
  async findAllStates() {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setDate(twentyFourHoursAgo.getDate() - 1);

      const queries = [
        this.prisma.create_Session.count(),

        this.prisma.create_Session.count({
          where: {
            created_at: {
              gte: twentyFourHoursAgo,
            },
          },
        }),

        this.prisma.create_Session.count({
          where: {
            is_completed: 1,
          },
        }),

        this.prisma.book_Session.count({
          where: {
            is_cancelled: 1,
          },
        }),
      ];

      const [
        totalSessions,
        newSessionsLastDay,
        completedSessions,
        cancelledBookings,
      ] = await this.prisma.$transaction(queries);

      const responseData = {
        totalSessions,
        upcomingSessions: newSessionsLastDay,
        completedSessions,
        cancelledSessions: cancelledBookings,
      };

      return {
        success: true,
        message: 'Overall session statistics retrieved successfully.',
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching overall session states`,
      };
    }
  }
}
