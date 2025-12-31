import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session-teacher.dto';
import { count } from 'console';
import { Mode } from '@prisma/client';
import { DateHelper } from 'src/common/helper/date.helper';
import { acceptReqDto } from './dto/accept-req.dto';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { MessageGateway } from '../chat/message/message.gateway';
import { StringHelper } from 'src/common/helper/string.helper';

@Injectable()
export class TeacherService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly messageGatway: MessageGateway,
  ) { }

  // session creating
  async create(createSessionDto: CreateSessionDto) {
    const userExists = await this.prismaService.user.findUnique({
      where: { id: createSessionDto.user_id, type: 'teacher' },
      select: { type: true, is_accepted: true },
    });

    if (userExists.type !== 'teacher') {
      return {
        success: false,
        message: 'Only users with TEACHER role can create sessions.',
      };
    }

    if (userExists.is_accepted === 'pending') {
      return {
        success: false,
        message:
          'Your application is still pending. You cannot create a session until your application is accepted.',
      };
    }

    if (!userExists) {
      return {
        message: 'User not found. Cannot create session.',
      };
    }

    if (userExists.type !== 'teacher') {
      return {
        message: 'Only users with TEACHER role can create sessions.',
      };
    }

    if (
      !Array.isArray(createSessionDto.available_slots_time_and_date) ||
      createSessionDto.available_slots_time_and_date.length === 0
    ) {
      return {
        message: 'Available slots time and date must be a non-empty array.',
      };
    }

    const currentDateUTC = new Date(Date.now());

    const hasPastSlot = createSessionDto.available_slots_time_and_date.some(
      (slot) => {
        const slotDate = new Date(slot);
        return slotDate < currentDateUTC;
      },
    );

    if (hasPastSlot) {
      return {
        message: 'You cannot set past dates or times for available slots.',
      };
    }

    try {
      const session = await this.prismaService.create_Session.create({
        data: {
          user_id: createSessionDto.user_id,
          session_type: createSessionDto.session_type,
          subject: createSessionDto.subject,
          session_charge: createSessionDto.session_charge,
          mode: createSessionDto.mode,
          slots_available: createSessionDto.slots_available || null,
          join_link: createSessionDto.join_link,
          available_slots_time_and_date: {
            set: createSessionDto.available_slots_time_and_date,
          },
        },
      });

      // started notification
      const admins = await this.prismaService.user.findMany({
        where: { type: 'admin' },
        select: { id: true },
      });

      const notificationPayload: any = {
        sender_id: createSessionDto.user_id,
        receiver_id: createSessionDto.user_id,
        text: 'You have successfully created a new teaching session.',
        type: 'session',
      };

      NotificationRepository.createNotification(notificationPayload);

      const userSocketId = this.messageGatway.clients.get(
        createSessionDto.user_id,
      );

      if (userSocketId) {
        this.messageGatway.server
          .to(userSocketId)
          .emit('notification', notificationPayload);
        console.log(`Notification sent to user ${createSessionDto.user_id}`);
      } else {
        console.log(
          `User ${createSessionDto.user_id} is not connected, notification will be sent later.`,
        );
      }

      if (admins.length > 0) {
        for (const admin of admins) {
          const admin_notificationPayload: any = {
            sender_id: createSessionDto.user_id,
            receiver_id: admin.id,
            text: `A new session has been created by teacher with ID: ${createSessionDto.user_id} Session Name: ${session.subject}.`,
            type: 'session',
          };

          NotificationRepository.createNotification(admin_notificationPayload);
          const userSocketId = this.messageGatway.clients.get(admin.id);

          if (userSocketId) {
            this.messageGatway.server
              .to(userSocketId)
              .emit('notification', admin_notificationPayload);
            console.log(`Notification sent to user ${admin.id}`);
          } else {
            console.log(
              `User ${admin.id} is not connected, notification will be sent later.`,
            );
          }
        }
      }

      // ended notification
      return {
        success: true,
        message: 'Session successfully created',
        session_type: session.session_type,
        subject: session.subject,
        user_id: session.user_id,
      };
    } catch (error) {
      console.error('Error creating session:', error);
    }
  }
  //get all sessions for one teacher with id
  async getAllSessionsForOneTeachers(userId: string) {
    try {
      const sessions = await this.prismaService.create_Session.findMany({
        where: { user_id: userId, is_completed: 0 },
        select: {
          id: true,
          user_id: true,
          subject: true,
          session_charge: true,
          mode: true,
          slots_available: true,
          available_slots_time_and_date: true,
          join_link: true,
          session_type: true,
          is_started: true,
          
        },
      });

      // const checkBookSessionStarted = await this.prismaService.book_Session.findMany({
      //   where: { create_session: { user_id: userId }, started_at: { not: null } },
      //   select: {
      //     id: true,
      //     started_at: true,
      //   }
      // });

      // console.log(checkBookSessionStarted);


      // const formattedSessions = await Promise.all(
      //   sessions.map(async (session) => {
      //     const startedCount = await this.prismaService.book_Session.count({
      //       where: {
      //         create_session_id: session.id,
      //         started_at: { not: null }, 
      //       },
      //     });

      //     return {
      //       ...session,
      //       sessionStarted: startedCount > 0, 
      //     };
      //   })
      // );

      return {
        success: true,
        data: sessions,

      };
    } catch (error) {
      console.error('Error in getAllSessionsForOneTeacher:', error);
      return { success: false, message: 'Failed to fetch sessions' };
    }
  }

  //get all sessions for one teacher without id
  async getAllSessionsForOneTeacher(userId: string) {
    return await this.prismaService.create_Session.findMany({
      where: { user_id: userId, is_completed: 0 },
      select: {
        id: true,
        user_id: true,
        subject: true,
        session_charge: true,
        mode: true,
        slots_available: true,
        available_slots_time_and_date: true,
        join_link: true,
        session_type: true,
      },
    });
  }



  async startASession(sessionId: string, userId: string) {

    try {
      const session = await this.prismaService.create_Session.findUnique({
        where: { id: sessionId, user_id: userId },
        select:{
          is_started: true
        }
      });
      if (!session) {
        return {
          success: false,
          message: 'Session not found or you are not authorized to start it',
        };
      }

      if(session.is_started === 1){
        return{
          success: false,
          message:"Already started"
        }
      }

      // const correctSessionOnBookSession = await this.prismaService.book_Session.findMany({
      //   where: { create_session_id: sessionId },
      //   select: {
      //     id: true,
      //     started_at: true,
      //   },
      // });


      // if (correctSessionOnBookSession.some(session => session.started_at)) {
      //   return {
      //     success: false,
      //     message: 'Session has already been started',
      //   };
      // }

      await this.prismaService.book_Session.updateMany({
        where: { create_session_id: sessionId },
        data: {
          started_at: new Date(),
        }
      });

      await this.prismaService.create_Session.updateMany({
        where: { id: sessionId },
        data:{
          is_started: 1
        }
      })

      return {
        success: true,
        message: 'Session started successfully',
      };
    } catch (error) {
      console.error('Error starting session:', error);
      return {
        success: false,
        message: 'An error occurred while starting the session',
      };
    }
  }

  //getting all sessions
  // async findAll() {
  //   const sessions = await this.prismaService.create_Session.findMany({
  //     select: {
  //       id: true,
  //       user_id: true,
  //       session_charge: true,
  //     },
  //   });

  //   const charges = sessions
  //     .map(({ session_charge }) => Number(session_charge))
  //     .filter((charge) => !isNaN(charge) && charge !== null);

  //   if (charges.length === 0) {
  //     return {
  //       id: null,
  //       name: null,
  //       priceRange: 'N/A',
  //     };
  //   }

  //   const min = Math.min(...charges);
  //   let max = Math.max(...charges);

  //   if (min === max) {
  //     max = min + 20;
  //   }

  //   const validUserIds = sessions
  //     .map(({ user_id }) => user_id)
  //     .filter((id): id is string => id !== null);

  //   const teacherIds = await this.prismaService.user.findMany({
  //     where: { id: { in: validUserIds } },
  //     select: {
  //       first_name: true,
  //       email: true,
  //       last_name: true,
  //       about_me: true,
  //       country: true,
  //       avatar: true,
  //       Rate_Session: true,
  //       city: true,
  //       Create_Session: {
  //         select: {
  //           subject: true,
  //           user_id: true,
  //           session_charge: true,
  //           mode: true,
  //           available_slots_time_and_date: true,
  //         },
  //       },
  //     },
  //   });

  //   if (teacherIds.length === 0) {
  //     return {
  //       teacherIds: null,
  //       priceRange: `${min} - ${max}`,
  //     };
  //   }

  //   const modes = [
  //     ...new Set(
  //       teacherIds.flatMap(({ Create_Session }) =>
  //         Create_Session.map(({ mode }) => mode),
  //       ),
  //     ),
  //   ];

  //   const nextAvailability = teacherIds
  //     .flatMap(({ Create_Session }) =>
  //       Create_Session.flatMap(
  //         ({ available_slots_time_and_date }) => available_slots_time_and_date,
  //       ),
  //     )
  //     .sort((a, b) => a.getTime() - b.getTime());

  //   if (
  //     nextAvailability.length > 0 &&
  //     nextAvailability[0].toDateString() === DateHelper.now().toDateString()
  //   ) {
  //     nextAvailability[0] = 'Today' as any;
  //   }
  //   const avgRate = teacherIds.map(({ Rate_Session }) => {
  //     const rates = Rate_Session.map(({ rating }) => rating);
  //     if (rates.length === 0) return 0;
  //     const total = rates.reduce((acc, curr) => acc + curr, 0);
  //     return total / rates.length;
  //   });

  //   return {
  //     teacherIds: teacherIds.map(
  //       ({
  //         first_name,
  //         last_name,
  //         avatar,
  //         about_me,
  //         country,
  //         email,
  //         city,
  //         Create_Session,
  //       }) => ({
  //         username: `${first_name} ${last_name}`,
  //         userid: Create_Session.length > 0 ? Create_Session[0]?.user_id : null, // Updated line
  //         avatar,
  //         email,
  //         about_me,
  //         avgRate,
  //         country,
  //         city,
  //         subjects: Create_Session.map(({ subject }) => subject),
  //         modes,
  //         priceRange: `${min} - ${max}`,
  //         nextAvailability:
  //           nextAvailability.length > 0 ? nextAvailability[0] : null,
  //         grades: '6-12',
  //       }),
  //     ),
  //   };
  // }
  async findAll() {
    const sessions = await this.prismaService.create_Session.findMany({
      select: {
        id: true,
        user_id: true,
        session_charge: true,
      },
    });

    const validUserIds = sessions
      .map(({ user_id }) => user_id)
      .filter((id): id is string => id !== null);

    const teacherIds = await this.prismaService.user.findMany({
      where: { id: { in: validUserIds } },
      select: {
        first_name: true,
        email: true,
        last_name: true,
        about_me: true,
        country: true,
        avatar: true,
        Rate_Session: true,
        city: true,
        id: true,
        Create_Session: {
          select: {
            subject: true,
            user_id: true,
            session_charge: true,
            mode: true,
            available_slots_time_and_date: true,
          },
        },
      },
    });

    if (teacherIds.length === 0) {
      return {
        teacherIds: null,
        priceRange: 'N/A',
      };
    }

    const teachers = teacherIds.map((teacher) => {
      const {
        first_name,
        last_name,
        avatar,
        about_me,
        country,
        email,
        city,
        Rate_Session,
        Create_Session,
      } = teacher;

      //  per-user price range
      const charges = Create_Session.map(({ session_charge }) =>
        Number(session_charge),
      ).filter((charge) => !isNaN(charge) && charge !== null);

      let priceRange = 'N/A';
      if (charges.length > 0) {
        let min = Math.min(...charges);
        let max = Math.max(...charges);
        if (min === max) max = min + 20;
        priceRange = `${min} - ${max}`;
      }

      const rates = Rate_Session.map(({ rating }) => rating);
      const avgRate = rates.length
        ? rates.reduce((a, b) => a + b, 0) / rates.length
        : 0;

      const modes = [...new Set(Create_Session.map(({ mode }) => mode))];
      const availability = Create_Session.flatMap(
        ({ available_slots_time_and_date }) => available_slots_time_and_date,
      ).sort((a, b) => a.getTime() - b.getTime());

      let nextAvailability = availability.length > 0 ? availability[0] : null;
      // if (nextAvailability && nextAvailability.toDateString() === DateHelper.now().toDateString()) {
      //   nextAvailability = 'Today' as any;
      // }

      return {
        username: `${first_name} ${last_name}`,
        userid: teacher.id,
        avatar,
        email,
        about_me,
        avgRate,
        country,
        city,
        subjects: Create_Session.map(({ subject }) => subject),
        modes,
        priceRange,
        nextAvailability,
        grades: '6-12',
      };
    });

    return { teacherIds: teachers };
  }

  //getting one session by id
  async findOne(id: string) {
    const session = await this.prismaService.create_Session.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }
  async update(
    id: string,
    updateSessionDto: UpdateTeacherDto,
    userId: string,
  ): Promise<any> {
    const session = await this.prismaService.create_Session.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    let isteacher = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { type: true },
    });

    if (isteacher.type !== 'teacher') {
      throw new ForbiddenException(
        'Only users with TEACHER role can update sessions',
      );
    }

    if (session.user_id !== userId) {
      throw new ForbiddenException(
        'You are not allowed to update this session',
      );
    }

    const updatedSession = await this.prismaService.create_Session.update({
      where: { id },
      data: updateSessionDto,
    });

    return {
      message: 'Session updated successfully',
      session_type: updatedSession.session_type,
      subject: updatedSession.subject,
      user_id: updatedSession.user_id,
    };
  }
  //delete session by id
  async remove(id: string, userId: string): Promise<any> {
    const session = await this.prismaService.create_Session.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.user_id !== userId) {
      throw new ForbiddenException(
        'You are not allowed to delete this session',
      );
    }

    await this.prismaService.create_Session.delete({
      where: { id },
    });
    return { message: 'Session deleted successfully' };
  }
  async getallEndedSessionsForOneTeacher(userId: string) {
    const myData = await this.prismaService.book_Session.findMany({
      where: { is_completed: 1, create_session: { user_id: userId } },
    });

    return {
      success: true,
      data: myData,
    };
  }
  async getallRequestsForReschedule(userId: string) {
    const checkTeacher = await this.prismaService.user.findUnique({
      where: { id: userId, type: 'teacher' },
    });

    const allreqForATeacher =
      await this.prismaService.reschedule_Session.findMany({
        where: {
          book_session: {
            create_session: {
              user_id: userId,
            },
          },
        },
      });

    if (!checkTeacher) {
      throw new NotFoundException('Teacher not found or user is not a teacher');
    } else {
      return allreqForATeacher;
    }
  }

  async handleRequest(
    requestId: string,
    userId: string,
    action: string,
    acceptDto: acceptReqDto,
  ) {
    const request = await this.prismaService.reschedule_Session.findUnique({
      where: { id: requestId },
      select: {
        book_session: {
          where: {
            create_session: { user_id: userId },
          },
        },
        is_accepted: true,
        is_rejected: true,
        user_id: true,
      },
    });

    if (!request) {
      return { message: 'Reschedule request not found' };
    }
    if (request.is_accepted === 1) {
      return {
        message:
          'This request has already been accepted, you cannot reject this',
      };
    }
    if (request.is_rejected === 1) {
      return {
        message:
          'This request has already been rejected, you cannot accept this',
      };
    }

    //using ternary operator
    //   request.is_accepted === 1 ?
    // { message: 'This request has already been accepted' } :
    // request.is_rejected === 1 ?
    //   { message: 'This request has already been rejected' } : null;

    const bookSession = request.book_session;
    if (!bookSession) {
      return { message: 'Associated book session not found' };
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.type !== 'teacher') {
      return {
        message:
          'Only users with TEACHER role can process reschedule requests.',
      };
    }

    if (action === 'accept') {
      // Logic to accept the request
      if (!acceptDto.rescheduled_date) {
        return { message: 'You must provide a rescheduled date' };
      }

      await this.prismaService.reschedule_Session.update({
        where: { id: requestId },
        data: {
          is_accepted: 1,
          is_rejected: 0,
          rescheduled_date: acceptDto.rescheduled_date,
          reject_reason: null,
        },
      });

      // accepted notification
      const notificationPayload: any = {
        sender_id: userId,
        receiver_id: request.user_id,
        text: `You have accepted a reschedule request for your session.`,
        type: 'reschedule_request',
      };
      NotificationRepository.createNotification(notificationPayload);

      const userSocketId = this.messageGatway.clients.get(request.user_id);

      if (userSocketId) {
        this.messageGatway.server
          .to(userSocketId)
          .emit('notification', notificationPayload);
        console.log(`Notification sent to user ${request.user_id}`);
      } else {
        console.log(
          `User ${request.user_id} is not connected, notification will be sent later.`,
        );
      }

      return { message: 'Reschedule request accepted successfully' };
    }

    if (action === 'reject' && request.is_accepted === 0) {
      // Logic to reject the request
      if (!acceptDto.reject_reason.trim()) {
        return { message: 'Reject reason cannot be empty' };
      }

      await this.prismaService.reschedule_Session.update({
        where: { id: requestId },
        data: {
          is_accepted: 0,
          is_rejected: 1,
          reject_reason: acceptDto.reject_reason,
          rescheduled_date: null,
        },
      });

      // rejected notification
      const notificationPayload: any = {
        sender_id: userId,
        receiver_id: request.user_id,
        text: `You have rejected a reschedule request for your session.`,
        type: 'reschedule_request',
      };
      NotificationRepository.createNotification(notificationPayload);

      const userSocketId = this.messageGatway.clients.get(request.user_id);

      if (userSocketId) {
        this.messageGatway.server
          .to(userSocketId)
          .emit('notification', notificationPayload);
        console.log(`Notification sent to user ${request.user_id}`);
      } else {
        console.log(
          `User ${request.user_id} is not connected, notification will be sent later.`,
        );
      }

      return { message: 'Reschedule request rejected successfully' };
    }

    return { message: 'Invalid action' };
  }
  //get all booked sessions for a teacher
  async getAllBookedSessionsForOneTeacher(userId: string) {
    const all = this.prismaService.book_Session.findMany({
      where: { create_session: { user_id: userId } },
      select: {
        create_session: {
          select: {
            id: true,
            user_id: true,
            subject: true,
            session_type: true,
          },
        },
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            type: true,
            avatar: true,
          },
        },
      },
    });

    const formattedResults = (await all).map((booking) => {
      const teacherID = `${booking.create_session.user_id}`;

      const sessionId = booking.create_session.id;
      const subject = booking.create_session.subject;
      const sessionType = booking.create_session.session_type;

      const studentId = booking.user?.id || null;
      const studentName = booking.user
        ? `${booking.user.first_name} ${booking.user.last_name}`
        : 'N/A';
      const studentType = booking.user?.type || 'N/A';

      return {
        teacher: {
          teacherId: teacherID,
        },
        session: {
          sessionId: sessionId,
          subject: subject,
          sessionType: sessionType,
        },
        student: {
          studentId: studentId,
          studentName: studentName,
          studentType: studentType,
        },
      };
    });

    return formattedResults;
  }
  //get all teachers
  async getAllTeachers() {
    return this.prismaService.user.findMany({
      where: { type: 'teacher' },
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
  }
  async getATeacherById(teacherId: string) {
    const teacher = await this.prismaService.user.findFirst({
      where: {
        id: teacherId,
        type: 'teacher',
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        type: true,
        avatar: true,
        country: true,
        city: true,
        grades_taught: true,
        about_me: true,
        created_at: true,
        certifications: true,
      },
    });

    if (!teacher) {
      return {
        success: false,
        message: 'Teacher not found or user is not a teacher',
        data: null,
      };
    }

    // Fetch all completed sessions
    const sessions = await this.prismaService.create_Session.findMany({
      where: { user_id: teacherId, is_completed: 1 },
      select: { session_charge: true },
    });

    // Count total sessions
    const totalSessions = sessions.length;

    // Convert each session_charge (string) to number and sum
    const totalEarnings = sessions.reduce((sum, s) => {
      const charge = parseFloat(s.session_charge || '0');
      return sum + (isNaN(charge) ? 0 : charge);
    }, 0);

    // Build URLs

    if (teacher.avatar) {
      teacher['avatar_url'] = `/avatar/${teacher.avatar}`;
    }

    if (
      Array.isArray(teacher.certifications) &&
      teacher.certifications.length > 0
    ) {
      teacher['certifications_urls'] = teacher.certifications.map(
        (cert) => `certificate/${cert}`,
      );
    }

    return {
      success: true,
      message: 'Teacher fetched successfully',
      data: {
        ...teacher,
        totalSessions,
        totalEarnings,
      },
    };
  }

  //uploading meterials
  async uploadMaterials(
    userID: string,
    sessionId: string,
    files: Express.Multer.File[],
  ) {
    try {
      const fileNames: string[] = [];
      const userId = userID;

      const userSessionData = await this.prismaService.user.findUnique({
        where: { id: userId, type: 'teacher' },
        select: {
          Create_Session: {
            where: { id: sessionId },
            select: {
              user_id: true,
              id: true,
            },
          },
        },
      });

      if (
        !userSessionData ||
        userSessionData.Create_Session.length === 0 ||
        userSessionData.Create_Session[0].user_id !== userId
      ) {
        return {
          success: false,
          message:
            'Session ID or User ID mismatch. You cannot upload materials for this session.',
        };
      }

      if (files && files.length > 0) {
        for (const file of files) {
          const fileName = `${StringHelper.randomString()}_${file.originalname}`;

          await SojebStorage.put(
            appConfig().storageUrl.material + '/' + fileName,
            file.buffer,
          );

          fileNames.push(fileName);
        }

        const updatedSession = await this.prismaService.create_Session.update({
          where: { id: sessionId },
          data: {
            pdf_attachment: { push: fileNames },
          },
        });

        const basePublicUrl = `http://localhost:${process.env.PORT || 4012}/public/storage/`;

        if (
          Array.isArray(updatedSession.pdf_attachment) &&
          updatedSession.pdf_attachment.length > 0
        ) {
          updatedSession['materials_urls'] = updatedSession.pdf_attachment.map(
            (material) => `${basePublicUrl}material/${material}`,
          );
        }

        return {
          success: true,
          message: 'Files uploaded and saved successfully',
          fileNames,
          materials_urls: updatedSession.pdf_attachment.map(
            (material) => `${basePublicUrl}material/${material}`,
          ),
        };
      } else {
        return {
          success: false,
          message: 'No files uploaded',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  async getAllMaterialsWithSession(userId: string) {
    const creator = await this.prismaService.user.findUnique({
      where: { id: userId, type: 'teacher' },
      select: {
        name: true,
        Create_Session: {
          select: {
            id: true,
            subject: true,
            user_id: true,
            session_type: true,
            pdf_attachment: true,
          },
        },
        Book_Sessions: {
          select: {
            user_id: true,
            is_completed: true,
            updated_at: true,
          },
        },
      },
    });

    return {
      creator,
    };
  }
  async getMaterialsForSession(sessionId: string) {
    const session = await this.prismaService.create_Session.findUnique({
      where: { id: sessionId },
      select: {
        pdf_attachment: true,
      },
    });
    if (!session) {
      return {
        success: false,
        message: 'Session not found',
        materials_urls: [],
      };
    }
    const basePublicUrl = `http://localhost:${process.env.PORT || 4012}/public/storage/`;

    if (
      Array.isArray(session.pdf_attachment) &&
      session.pdf_attachment.length > 0
    ) {
      const materials_urls = session.pdf_attachment.map(
        (material) => `${basePublicUrl}material/${material}`,
      );

      return {
        success: true,
        message: 'Materials fetched successfully',
        materials_urls,
      };
    } else {
      return {
        success: true,
        message: 'No materials found for this session',
        materials_urls: [],
      };
    }
  }
  async deleteMaterialFromSession(
    sessionId: string,
    materialFileName: string,
    userId: string,
  ) {
    try {
      const session = await this.prismaService.create_Session.findUnique({
        where: { id: sessionId, user_id: userId },
        select: {
          pdf_attachment: true,
        },
      });

      if (!session) {
        return {
          success: false,
          message: 'Session not found',
        };
      }

      if (!Array.isArray(session.pdf_attachment)) {
        return {
          success: false,
          message: 'Invalid pdf_attachment format',
        };
      }

      if (!session.pdf_attachment.includes(materialFileName)) {
        return {
          success: false,
          message: 'Material not found in this session',
        };
      }

      const updatedMaterials = session.pdf_attachment.filter(
        (material) => material !== materialFileName,
      );

      const updatedSession = await this.prismaService.create_Session.update({
        where: { id: sessionId, user_id: userId },
        data: {
          pdf_attachment: updatedMaterials,
        },
      });

      return {
        success: true,
        message: 'Material deleted successfully from session',
      };
    } catch (error) {
      console.error('Error deleting material:', error);
      return {
        success: false,
        message: 'An unexpected error occurred',
      };
    }
  }

  //recent reviews from students
  async getRecentReviewsForTeacher(teacherId: string) {
    const reviews = await this.prismaService.rate_Session.findMany({
      where: {
        create_session: {
          user_id: teacherId,
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        created_at: true,
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
          },
        },
      },
      take: 5,
    });

    const formatReviews = reviews.map((review) => {
      const basePublicUrl = `http://localhost:${process.env.PORT || 4012}/public/storage/`;
      return {
        ...review,
        user: {
          ...review.user,
          avatar: review.user.avatar
            ? `${basePublicUrl}avatar/${review.user.avatar}`
            : null,
        },
      };
    });

    return {
      success: true,
      message: 'Recent reviews fetched successfully',
      data: formatReviews,
    };
  }
}
