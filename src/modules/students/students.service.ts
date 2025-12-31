import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';

import { MailService } from 'src/mail/mail.service';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Prisma } from '@prisma/client';
import { ReqDto } from './dto/req.dto';
import { Body } from '@nestjs/common';
import { StudentRatingDto } from './dto/student-rating.dto';
import { Role } from '../../common/guard/role/role.enum';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { MessageGateway } from 'src/modules/chat/message/message.gateway';
import { Session } from '../admin/sessions/entities/session.entity';
import { stat } from 'fs';

@Injectable()
export class StudentsService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
    private readonly messageGateway: MessageGateway,
    @InjectRedis() private readonly redis: Redis,
  ) { }

  create(createStudentDto: CreateStudentDto) {
    return 'This action adds a new student';
  }
  async bookASession(
    sessionId: string,
    userId: string,
    createStudentDto: CreateStudentDto,
  ) {
    const slotDate = createStudentDto.slots;
    if (!slotDate) {
      throw new BadRequestException('Slot date is required');
    }

    const session = await this.prisma.create_Session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (
      session.slots_available !== null &&
      Number(session.slots_available) >= 15
    ) {
      throw new BadRequestException('No slots available for this session');
    }

    const isSlotAvailable = session.available_slots_time_and_date.some(
      (slot) => slot.toISOString() === slotDate.toISOString(),
    );

    if (!isSlotAvailable) {
      return { message: 'Sorry no availbale slots on this time ' };
    }

    const alreadyBooked = await this.prisma.book_Session.findFirst({
      where: {
        create_session_id: sessionId,
        user_id: userId,
        session_date: slotDate,
      },
    });

    if (alreadyBooked) {
      return {
        status: HttpStatus.CONFLICT,
        message: 'You have already booked this session at the selected time',
      };
    }

    const bookedSession = await this.prisma.book_Session.create({
      data: {
        user_id: userId,
        username: createStudentDto.name,
        subject: session.subject,
        create_session_id: sessionId,
        session_date: createStudentDto.slots,
        status: 'pending',
      },
    });

    await this.prisma.create_Session.update({
      where: { id: sessionId },
      data: {
        slots_available: (Number(session.slots_available) - 1).toString(),
      },
    });

    // Send  booking confirmation student notification
    const bookNotificationPayload: any = {
      sender_id: userId,
      receiver_id: userId,
      title: 'New Session Booking',
      message: `A new session has been booked for ${session.subject} on ${slotDate.toISOString()}`,
      type: 'session_booking',
    };

    NotificationRepository.createNotification(bookNotificationPayload);

    const userSocketId = this.messageGateway.clients.get(userId);

    if (userSocketId) {
      this.messageGateway.server
        .to(userSocketId)
        .emit('notification', bookNotificationPayload);
      console.log(`Notification sent to user ${userId}`);
    } else {
      console.log(
        `User ${userId} is not connected, notification will be sent later.`,
      );
    }

    // send booking confirmation teacher notification
    const bookTeacherNotificationPayload: any = {
      sender_id: userId,
      receiver_id: session.user_id,
      title: 'New Session Booking',
      message: `A new session has been booked for ${session.subject} by  ${createStudentDto.name} on ${slotDate.toISOString()}`,
      type: 'session_booking',
    };

    NotificationRepository.createNotification(bookTeacherNotificationPayload);

    const userSocketIdTutor = this.messageGateway.clients.get(session.user_id);

    if (userSocketIdTutor) {
      this.messageGateway.server
        .to(userSocketIdTutor)
        .emit('notification', bookTeacherNotificationPayload);
      console.log(`Notification sent to user ${session.user_id}`);
    } else {
      console.log(
        `User ${session.user_id} is not connected, notification will be sent later.`,
      );
    }

    // send booking confirmation admin notification
    const admins = await this.prisma.user.findMany({
      where: { type: 'admin' },
    });

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        const bookAdminNotificationPayload: any = {
          sender_id: userId,
          receiver_id: admin.id,
          title: 'New Session Booking',
          message: `A new session has been booked for ${session.subject} by  ${createStudentDto.name} on ${slotDate.toISOString()}`,
          type: 'session_booking',
        };

        const userSocketId = this.messageGateway.clients.get(admin.id);

        if (userSocketId) {
          this.messageGateway.server
            .to(userSocketId)
            .emit('notification', bookAdminNotificationPayload);
          console.log(`Notification sent to user ${admin.id}`);
        } else {
          console.log(
            `User ${admin.id} is not connected, notification will be sent later.`,
          );
        }

        NotificationRepository.createNotification(bookAdminNotificationPayload);
      }
    }

    return {
      message: 'Session booked successfully',
      bookedSession,
    };
  }
  async getAllBookedSessionsForStudent(userId: string) {
    // Fetch the student
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        username: true,
        avatar: true,
        type: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.type !== 'student')
      throw new BadRequestException('Only students can access their booked sessions');

    // Fetch booked sessions
    const bookings = await this.prisma.book_Session.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        username: true,
        user_id: true,
        session_date: true,
        is_joined: true,
        is_cancelled: true,
        is_completed: true,
        status: true,
        create_session: {
          select: {
            id: true,
            user_id: true,
            session_type: true,
            subject: true,
            session_charge: true,
            mode: true,
            join_link: true,
            user: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
          },
        },
        Reschedule_Session: true,
      },
      orderBy: { session_date: 'desc' },
    });

    // Format the bookings
    const formattedBookings = bookings.map((booking) => {
      const reschedule = booking.Reschedule_Session?.[0];
      const session = booking;
      const sessionInfo = booking.create_session;

      const teacherName = sessionInfo?.user
        ? `${sessionInfo.user.first_name ?? ''} ${sessionInfo.user.last_name ?? ''}`.trim()
        : null;

      return {
        studentDetails: {
          studentUsernameWhileBooking: booking.username,
          id: user.id,
          userName: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          avatar: user.avatar ?? null,
        },
        sessionDetails: session
          ? {
            sessionId: session.id,
            teacherId: session.user_id,
            teacherName,
            sessionType: sessionInfo.session_type,
            subject: sessionInfo.subject,
            charge: sessionInfo.session_charge,
            mode: sessionInfo.mode,
            joinLink: sessionInfo.join_link ?? 'N/A',
          }
          : null,
        rescheduleDetails: reschedule
          ? {
            requestId: reschedule.id,
            subject: reschedule.subject,
            reason: reschedule.reason,
            isAccepted: Boolean(reschedule.is_accepted),
            isRejected: Boolean(reschedule.is_rejected),
            rejectReason: reschedule.reject_reason ?? 'N/A',
            rescheduledDate: reschedule.rescheduled_date?.toISOString() ?? null,
          }
          : null,
        sessionDate: booking.session_date?.toISOString() ?? null,
        isJoined: Boolean(booking.is_joined),
        isCancelled: Boolean(booking.is_cancelled),
        isCompleted: Boolean(booking.is_completed),
        status: booking.status ?? 'N/A',
      };
    });

    return {
      success: true,
      bookings: formattedBookings,
    };
  }
  async getAllCompletedSessionsForStudent(userId: string) {
    const completedSessions = await this.prisma.book_Session.findMany({
      where: {
        user_id: userId,
        is_joined: 1,
        is_completed: 1,
      },
      select: {
        id: true,
        username: true,
        session_date: true,
        is_completed: true,
        session_period: true,
        create_session: {
          select: {
            id: true,
            user_id: true,
            session_type: true,
            subject: true,
            session_charge: true,
            mode: true,
            join_link: true,
          },
        },
        Rate_Session: {
          select: {
            id: true,
            rating: true,
            comment: true,
            user_id: true,
          },
        },
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true, avatar: true },
    });

    const teacherName =
      `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
    const avatar = user?.avatar ?? null;

    const formattedCompletedSessions = completedSessions.map((session) => {
      const createSession = session.create_session ?? null;
      const rating =
        session.Rate_Session?.length > 0 ? session.Rate_Session[0].rating : 0;

      const sessionDetails = createSession
        ? {
          sessionId: createSession.id,
          teacherName: teacherName || 'N/A',
          teacherId: createSession.user_id,
          avatar: avatar,
          sessionRate: rating,
          sessionType: createSession.session_type,
          subject: createSession.subject,
          charge: createSession.session_charge,
          mode: createSession.mode,
          joinLink: createSession.join_link ?? 'N/A',
          sessionPeriod: session.session_period || '60 mins',
        }
        : {
          sessionRate: rating,
        };

      return {
        sessionId: session.id,
        studentUsername: session.username,
        sessionDate: session.session_date
          ? new Date(session.session_date).toISOString()
          : 'N/A',
        isCompleted: session.is_completed,
        sessionDetails,
      };
    });

    return {
      completedSessions: formattedCompletedSessions,
    };
  }
  async joinsession(userId: string, sessionId: string) {
    try {
      const session = await this.prisma.book_Session.findUnique({
        where: { id: sessionId, user_id: userId },
        select: {
          id: true,
          username: true,
          is_joined: true,
          is_cancelled: true,
          payment_status: true,
        },
      });



      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (session.payment_status === "paid") {
        if (session.is_cancelled === 1) {
          return { message: 'Cannot join a cancelled session' };
        }

        if (session.is_joined === 1) {
          return { message: 'Session already joined' };
        } else {
          await this.prisma.book_Session.update({
            where: { id: sessionId },
            data: { is_joined: 1, joined_at: new Date() },
          });

          // send join session notification
          const joinNotificationPayload: any = {
            sender_id: userId,
            receiver_id: userId,
            text: `You have joined the session: ${session.username}`,
            type: 'session_joined',
          };

          const userSocketId = this.messageGateway.clients.get(userId);

          if (userSocketId) {
            this.messageGateway.server
              .to(userSocketId)
              .emit('notification', joinNotificationPayload);
            console.log(`Notification sent to user ${userId}`);
          } else {
            console.log(
              `User ${userId} is not connected, notification will be sent later.`,
            );
          }

          NotificationRepository.createNotification(joinNotificationPayload);

          // teacher notification
          const bookedSession = await this.prisma.book_Session.findUnique({
            where: { id: sessionId },
            select: { create_session_id: true },
          });

          const createSession = await this.prisma.create_Session.findUnique({
            where: { id: bookedSession.create_session_id },
            select: { subject: true, user_id: true },
          });
          const teacherNotificationPayload: any = {
            sender_id: userId,
            receiver_id: createSession.user_id,
            text: `Your session with Subject Name: ${createSession.subject} has been joined by ${session.username}`,
            type: 'session_joined',
          };

          const userSocketIdTutor = this.messageGateway.clients.get(
            createSession.user_id,
          );

          if (userSocketIdTutor) {
            this.messageGateway.server
              .to(userSocketIdTutor)
              .emit('notification', teacherNotificationPayload);
            console.log(`Notification sent to user ${createSession.user_id}`);
          } else {
            console.log(
              `User ${createSession.user_id} is not connected, notification will be sent later.`,
            );
          }

          NotificationRepository.createNotification(teacherNotificationPayload);

          return { success: true, message: 'Session joined successfully' };
        }
      } else {
        return {
          success: false,
          message: 'Payment pending. Please complete the payment to join the session.'
        }
      }


    } catch (error) {
      console.error('Error in joinsession service:', error);
      throw new InternalServerErrorException('Failed to join session');
    }
  }
  async cancellSession(userId: string, sessionId: string) {
    const session = await this.prisma.book_Session.findFirst({
      where: { id: sessionId, user_id: userId },
      select: {
        id: true,
        username: true,
        is_joined: true,
      },
    });
    if (session?.is_joined === 1) {
      return {
        success: false,
        message: 'You cannot cancel a session that has already been joined',
      };
    }

    if (!session) {
      throw new NotFoundException('Session not found');
    }
    await this.prisma.book_Session.update({
      where: { id: sessionId },
      data: { is_cancelled: 1 },
    });
    return { success: true, message: 'Session cancelled successfully' };
  }
  async requestRescheduleSession(
    reqDTo: ReqDto,
    sessionId: string,
    userId: string,
  ) {
    try {
      const req = await this.prisma.book_Session.findFirst({
        where: { id: sessionId, user_id: userId },
        select: {
          id: true,
          username: true,
          is_joined: true,
          is_cancelled: true,
          started_at: true,     
          session_date: true,
          status: true,
          is_request_for_reschedule: true,
          subject: true,
          create_session_id: true,
          create_session: { select: { user_id: true } },
        },
      });

      if (!req) {
        return { success: false, message: 'Session not found' };
      }

      // Cannot reschedule if already joined or cancelled
      if (req.is_joined === 1) {
        return { success: false, message: 'You cannot reschedule a session that has already been joined' };
      }

      if (req.is_cancelled === 1) {
        return { success: false, message: 'You cannot reschedule a cancelled session' };
      }

      // Check for existing reschedule request
      const existingRescheduleRequest = await this.prisma.reschedule_Session.findFirst({
        where: { user_id: userId, book_session_id: sessionId },
      });

      if (existingRescheduleRequest) {
        return { success: false, message: 'A reschedule request has already been made for this session' };
      }

      if (!req.started_at) {
        return { success: false, message: 'Session has not started yet, so you cannot request a reschedule.' };
      }

      if(req.status === "Reschedule_requested" || req.is_request_for_reschedule === 1){
        return { success: false, message: 'A reschedule request is already pending for this session.' };
      }

      const now = new Date();
      const sessionStart = new Date(req.started_at); 

      const minRescheduleTime = new Date(sessionStart.getTime() + 10 * 1000);
      const maxRescheduleTime = new Date(sessionStart.getTime() + 3 * 60 * 60 * 1000);

      console.log("Session started_at:", sessionStart.toISOString());


      if (now < minRescheduleTime) {
        return { success: false, message: 'You can request a reschedule only after 10 seconds of session start' };
      }

      if (now > maxRescheduleTime) {
        return { success: false, message: 'You cannot request a reschedule after 3 hours of session start' };
      }

      await this.prisma.reschedule_Session.create({
        data: {
          user_id: userId,
          username: reqDTo.name,
          subject: req.subject,
          reason: reqDTo.reason,
          book_session_id: sessionId,
        },
      });

      await this.prisma.book_Session.update({
        where: { id: sessionId },
        data: { is_request_for_reschedule: 1, status: 'Reschedule_requested' },
      });

      return { success: true, message: 'Reschedule request sent successfully' };
    } catch (error) {
      console.error('Error in requestRescheduleSession service:', error);
      throw new Error(`Service error: ${error.message || error}`);
    }
  }
  async getAllStudents() {
    const students = await this.prisma.user.findMany({
      where: { type: 'student' },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        avatar: true,
        country: true,
        city: true,
        about_me: true,
        created_at: true,
      },
    });
    return { students };
  }
  async getAStudentById(id: string) {
    const student = await this.prisma.user.findUnique({
      where: { id, type: 'student' },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        avatar: true,
        country: true,
        city: true,
        grade_level: true,
        about_me: true,
        created_at: true,
      },
    });

    const totalBookedSessions = await this.prisma.book_Session.count({
      where: { user_id: id },
    });

    if (!student) {
      return { message: 'Student not found' };
    }
    return {
      success: true,
      message: 'Student fetched successfully',
      data: {
        ...student,
        totalBookedSessions,
      },
    };
  }
  async rateASession(
    body: StudentRatingDto,
    bookSessionID: string,
    userId: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { type: true },
      });

      if (!user || user.type !== 'student') {
        return { message: ' Unauthorized: Only students can rate sessions ' };
      }

      const bookSession = await this.prisma.book_Session.findFirst({
        where: {
          user_id: userId,
          id: bookSessionID,
        },
        select: { id: true, create_session_id: true },
      });

      if (!bookSession) {
        return { message: 'Booking session not found' };
      }

      const existingRating = await this.prisma.rate_Session.findUnique({
        where: {
          user_id_book_session_id: {
            user_id: userId,
            book_session_id: bookSession.id,
          },
        },
      });

      // if (existingRating) {
      //   return { message: 'You have already rated this session' };
      // }

      const createRateASession = await this.prisma.rate_Session.create({
        data: {
          user_id: userId,
          rating: body.rating,
          book_session_id: bookSession.id,
          comment: body.comment,
          create_session_id: bookSession.create_session_id,
        },
      });

      return { message: 'Session rated successfully', createRateASession };
    } catch (error) {
      console.error('Error in rateASession service:', error);
      throw new Error(`Service error: ${error.message || error}`);
    }
  }
  async getAllBookedSessionsMaterialsForStudent(userId: string) {
    const bookings = await this.prisma.book_Session.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        user_id: true,
        username: true,
        session_date: true || null,
        is_joined: true || null,
        is_cancelled: true || null,
        is_completed: true || null,
        is_request_for_reschedule: true || null,
        status: true || null,
        create_session: {
          select: {
            id: true,
            user_id: true,
            session_type: true,
            subject: true,
            session_charge: true,
            mode: true,
            join_link: true,
            pdf_attachment: true,
          },
        },
        Reschedule_Session: {
          select: {
            id: true,
            subject: true,
            reason: true,
            is_accepted: true,
            is_rejected: true,
            reject_reason: true,
            rescheduled_date: true,
          },
        },
      },
    });


    const teacherIDs = bookings.map(booking => booking.create_session.user_id);

    const teachers = await this.prisma.user.findMany({
      where: { id: { in: teacherIDs } },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        avatar: true,
        type: true,
      },
    });

    if (!teachers || teachers.length === 0) {
      throw new NotFoundException('Teachers not found');
    }

    const formattedBookings = bookings.map((booking) => {
      const teacher = teachers.find(t => t.id === booking.create_session.user_id);
      const teacherName = teacher ? `${teacher.first_name ?? ''} ${teacher.last_name ?? ''}`.trim() : 'N/A';
      const avatar = teacher ? teacher.avatar : null;

      return {
        sessionDate: booking.session_date
          ? new Date(booking.session_date).toISOString()
          : 'N/A',

        sessionDetails: booking.create_session
          ? {
            teacherName: teacherName,
            avatar: avatar,
            subject: booking.create_session.subject,
            mode: booking.create_session.mode,
            pdfAttachment: booking.create_session.pdf_attachment ?? 'N/A',
          }
          : 'sessionDetails not available',
      };
    });

    return {
      bookings: formattedBookings,
    };
  }
}
