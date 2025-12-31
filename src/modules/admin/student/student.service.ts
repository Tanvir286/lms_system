import { Injectable } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Restriction_period } from '@prisma/client';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  //find all students
  async getAllstudetnds(type: string) {
    if (type !== 'admin') {
      return {
        success: false,
        message: 'unauthorized',
      };
    }

    const studentBookedSessions = await this.prisma.book_Session.findMany({
      select: {
        id: true,
        username: true,
        status: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            address: true,
            grade_level: true,
            Book_Sessions: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    const studentsInfo = await this.prisma.user.findMany({
      where: { type: 'student' },
      select: {
        id: true,
        name: true,
        email: true,
        grade_level: true,
        address: true,
        status: true,
        Book_Sessions: {
          select: {
            id: true,
          },
        },
      },
    });

    const totalData = await Promise.all(
      studentBookedSessions.map(async (session) => {
        const total = await this.prisma.book_Session.count({
          where: { user_id: session.user.id },
        });
      }),
    );

    return {
      success: true,
      data: studentsInfo,
      totalData,
    };
  }
  async getOneStudent(id: string) {
    try {
      const existStudent = await this.prisma.user.findUnique({
        where: { id: id, type: 'student' },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      return {
        success: true,
        data: existStudent,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: 'Error fetching student',
        error: error.message,
      };
    }
  }
  async restrictedUserAccess(
    type: string,
    restrictedId: string,
    restriction_period: Restriction_period,
    restriction_reason: string,
  ) {
    if (type !== 'admin') {
      return {
        success: false,
        message: 'Unauthorized access',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: restrictedId },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    if (user.is_restricted === 1) {
      return {
        success: false,
        message: 'User is already restricted',
      };
    }

    await this.prisma.user.update({
      where: { id: restrictedId },
      data: {
        is_restricted: 1,
        status: 0,
        restriction_period: restriction_period,
        restriction_reason: restriction_reason,
      },
    });

    return {
      success: true,
      message: 'User restricted successfully',
    };
  }
  async getRestrictedUsers() {
    const restrictedUsers = await this.prisma.user.findMany({
      where: {
        is_restricted: 1,
        type: 'student',
      },
      select: {
        id: true,
        name: true,
        email: true,
        restriction_reason: true,
        restriction_period: true,
        is_restricted: true,
        type: true,
      },
    });

    return {
      success: true,
      data: restrictedUsers,
    };
  }
  async unrestrictAUser(type: string, userId: string) {
    if (type !== 'admin') {
      return {
        success: false,
        message: 'Unauthorized access',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    // Update user to unrestricted
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        is_restricted: 0,
        restriction_reason: null,
        restriction_period: null,
      },
    });

    return {
      success: true,
      message: 'User unrestricted successfully',
    };
  }
  async delete(id: string, type: string) {
    if (type !== 'admin') {
      return {
        success: false,
        message: 'Unauthorized access',
      };
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    await this.prisma.user.delete({ where: { id } });
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  //All Student States
  async findAllStudentStates() {
    try {
      const baseStudentFilter = {
        type: 'student',
      };

      const queries = [
        this.prisma.user.count({
          where: baseStudentFilter,
        }),

        this.prisma.user.count({
          where: {
            ...baseStudentFilter,
            status: 1,
          },
        }),

        this.prisma.user.count({
          where: {
            ...baseStudentFilter,
            status: {
              not: 1,
            },
          },
        }),

        this.prisma.book_Session.count({
          where: {
            user: {
              type: 'student',
            },
          },
        }),
      ];

      const [
        totalStudents,
        activeStudents,
        inactiveStudents,
        totalBookingsByStudents,
      ] = await this.prisma.$transaction(queries);

      const responseData = {
        totalStudents,
        activeStudents,
        inactiveStudents,
        totalBookingsByStudents,
      };

      return {
        success: true,
        message: 'Student statistics retrieved successfully.',
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching student states: ${error.message}`,
      };
    }
  }

  // Get a student states
  async findAStudentStates(id: string) {
    try {
      const student = await this.prisma.user.findFirst({
        where: { id: id, type: 'student' },
      });

      if (!student) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const baseSessionFilter = {
        user_id: id,
      };

      const queries = [
        this.prisma.book_Session.count({
          where: baseSessionFilter,
        }),

        this.prisma.book_Session.count({
          where: {
            ...baseSessionFilter,
            status: 'pending',
          },
        }),

        this.prisma.book_Session.count({
          where: {
            ...baseSessionFilter,
            is_completed: 1,
          },
        }),

        this.prisma.book_Session.count({
          where: {
            ...baseSessionFilter,
            is_cancelled: 1,
          },
        }),

        this.prisma.paymentTransaction.aggregate({
          _sum: {
            paid_amount: true,
          },
          where: {
            user_id: id,
            status: 'succeeded',
          },
        }),
      ];

      const [
        totalBookedSessions,
        pendingSessions,
        completedSessions,
        cancelledSessions,
        totalPaymentResult,
      ] = await this.prisma.$transaction(queries);

      const aggregateResult = totalPaymentResult as {
        _sum: { paid_amount: Prisma.Decimal | null };
      };

      const paidAmountDecimal = aggregateResult._sum.paid_amount;

      const totalPaid = paidAmountDecimal ? paidAmountDecimal.toNumber() : 0;

      const responseData = {
        totalBookedSessions,
        pendingSessions,
        completedSessions,
        cancelledSessions,
        totalPaid,
      };

      return {
        success: true,
        message: `Statistics for student retrieved successfully.`,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching student states`,
      };
    }
  }
  // Get a student all sesson info
  async findAStudentAllSession(id: string) {
    try {
      const student = await this.prisma.user.findFirst({
        where: { id: id, type: 'student' },
      });

      if (!student) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const studentBookings = await this.prisma.book_Session.findMany({
        where: {
          user_id: id,
        },
        select: {
          id: true,

          create_session: {
            select: {
              id: true,
              subject: true,
              session_type: true,
              created_at: true,
              status: true,

              user: {
                select: {
                  name: true,
                  hourly_rate: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (!studentBookings || studentBookings.length === 0) {
        return {
          success: true,
          message: 'This student has not booked any sessions yet.',
          data: [],
        };
      }

      const formattedSessions = studentBookings.map((booking) => {
        const session = booking.create_session;
        const tutor = session?.user;

        return {
          bookingId: booking.id,
          sessionId: session?.id,
          tutorName: tutor?.name,
          subject: session?.subject,
          sessionType: session?.session_type,
          tutorHourlyRate: tutor?.hourly_rate,
          sessionCreateDate: session?.created_at,
          sessionStatus: session.status,
        };
      });

      return {
        success: true,
        message: 'Student session history retrieved successfully.',
        data: formattedSessions,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching student's sessions: ${error.message}`,
      };
    }
  }
}
