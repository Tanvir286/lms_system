import { Injectable } from '@nestjs/common';
import { CreateWebsiteInfoDto } from './dto/create-website-info.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { StringHelper } from '../../../common/helper/string.helper';
import { Prisma } from '@prisma/client';

@Injectable()
export class WebsiteInfoService {
  constructor(private prisma: PrismaService) {}

  async create(
    createWebsiteInfoDto: CreateWebsiteInfoDto,
    files: {
      logo?: Express.Multer.File;
      favicon?: Express.Multer.File;
    },
  ) {
    try {
      const data: any = {};
      if (createWebsiteInfoDto.name) {
        data.name = createWebsiteInfoDto.name;
      }
      if (createWebsiteInfoDto.phone_number) {
        data.phone_number = createWebsiteInfoDto.phone_number;
      }
      // if (createWebsiteInfoDto.email) {
      //   data.email = createWebsiteInfoDto.email;
      // }
      if (createWebsiteInfoDto.address) {
        data.address = createWebsiteInfoDto.address;
      }
      if (createWebsiteInfoDto.copyright) {
        data.copyright = createWebsiteInfoDto.copyright;
      }
      if (createWebsiteInfoDto.cancellation_policy) {
        data.cancellation_policy = createWebsiteInfoDto.cancellation_policy;
      }
      if (files && files.logo) {
        // delete old logo from storage
        const logo = await this.prisma.websiteInfo.findFirst();
        if (logo) {
          await SojebStorage.delete(
            appConfig().storageUrl.websiteInfo + logo.logo,
          );
        }
        // upload file
        const fileName = `${StringHelper.randomString()}${files.logo.originalname}`;
        await SojebStorage.put(
          appConfig().storageUrl.websiteInfo + fileName,
          files.logo.buffer,
        );
        data.logo = fileName;
      }
      if (files && files.favicon) {
        // delete old favicon from storage
        const favicon = await this.prisma.websiteInfo.findFirst();
        if (favicon) {
          await SojebStorage.delete(
            appConfig().storageUrl.websiteInfo + favicon.favicon,
          );
        }
        // upload file
        const fileName = `${StringHelper.randomString()}${files.favicon.originalname}`;
        await SojebStorage.put(
          appConfig().storageUrl.websiteInfo + fileName,
          files.favicon.buffer,
        );

        data.favicon = fileName;
      }

      // check if website info already exists, then update it, otherwise create new
      const checkWebsiteInfo = await this.prisma.websiteInfo.findFirst();

      if (checkWebsiteInfo) {
        await this.prisma.websiteInfo.update({
          where: { id: checkWebsiteInfo.id },
          data: {
            ...data,
          },
        });
      } else {
        await this.prisma.websiteInfo.create({
          data: {
            ...data,
          },
        });
      }

      const websiteInfo = await this.prisma.websiteInfo.findFirst();

      if (files && files.logo) {
        await this.prisma.websiteInfo.update({
          where: { id: websiteInfo.id },
          data: { logo: files.logo[0].filename },
        });
      }

      if (files && files.favicon) {
        await this.prisma.websiteInfo.update({
          where: { id: websiteInfo.id },
          data: { favicon: files.favicon[0].filename },
        });
      }

      return {
        success: true,
        message: 'Website info updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll() {
    try {
      const websiteInfo = await this.prisma.websiteInfo.findFirst({
        select: {
          id: true,
          name: true,
          phone_number: true,
          email: true,
          address: true,
          logo: true,
          favicon: true,
          copyright: true,
          cancellation_policy: true,
        },
      });

      if (websiteInfo.logo) {
        websiteInfo['logo_url'] = SojebStorage.url(
          appConfig().storageUrl.websiteInfo + websiteInfo.logo,
        );
      }

      if (websiteInfo.favicon) {
        websiteInfo['favicon_url'] = SojebStorage.url(
          appConfig().storageUrl.websiteInfo + websiteInfo.favicon,
        );
      }

      return {
        success: true,
        data: websiteInfo,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  //dashboard top view
  async findDashboardCounts(startDateString?: string) {
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      let startDate: Date;
      if (startDateString) {
        startDate = new Date(startDateString);
        if (isNaN(startDate.getTime())) {
          return {
            success: false,
            message: 'Invalid start date format. Please use YYYY-MM-DD.',
          };
        }
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      }

      const userCountsPromise = this.prisma.user.groupBy({
        by: ['type'],
        _count: {
          id: true,
        },
        where: {
          type: {
            in: ['teacher', 'student'],
          },
        },
      });

      const sessionCountPromise = this.prisma.create_Session.count({
        where: {
          created_at: {
            gte: startDate,
            lte: today,
          },
        },
      });

      const totalEarningsPromise = this.prisma.paymentTransaction.aggregate({
        _sum: {
          paid_amount: true,
        },
        where: {
          status: 'succeeded',
        },
      });

      const [userCountsByType, sessionCount, totalEarningsResult] =
        await Promise.all([
          userCountsPromise,
          sessionCountPromise,
          totalEarningsPromise,
        ]);

      const formattedUserCounts = {
        teachers: 0,
        students: 0,
      };
      for (const group of userCountsByType) {
        if (group.type === 'teacher') {
          formattedUserCounts.teachers = group._count.id;
        } else if (group.type === 'student') {
          formattedUserCounts.students = group._count.id;
        }
      }

      const totalEarnings = Number(totalEarningsResult._sum.paid_amount ?? 0);

      const responseData = {
        userCounts: formattedUserCounts,
        count: sessionCount,
        totalEarnings: totalEarnings,
      };

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching dashboard counts: ${error.message}`,
      };
    }
  }

  // Get All payment states
  async findPaymentStates() {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const queries = [
        //Calculate Total Revenue from all successful non-payout transactions.
        this.prisma.paymentTransaction.aggregate({
          _sum: {
            paid_amount: true,
          },
          where: {
            raw_status: 'succeeded',
            type: {
              not: 'payout',
            },
          },
        }),

        // Calculate Last Month's Revenue.
        this.prisma.paymentTransaction.aggregate({
          _sum: {
            paid_amount: true,
          },
          where: {
            status: 'succeeded',
            type: {
              not: 'payout',
            },
            created_at: {
              gte: oneMonthAgo,
            },
          },
        }),

        //Calculate Total Payouts from all successful payout transactions.
        this.prisma.paymentTransaction.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            status: 'succeeded',
            raw_status: 'succeeded',
          },
        }),

        // Calculate Last Month's Payouts.
        this.prisma.paymentTransaction.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            status: 'succeeded',
            raw_status: 'succeeded',
            created_at: {
              gte: oneMonthAgo,
            },
          },
        }),
      ];

      const [
        totalRevenueResult,
        lastMonthRevenueResult,
        totalPayoutsResult,
        lastMonthPayoutsResult,
      ] = await this.prisma.$transaction(queries);

      const getSum = (
        result: { _sum: { [key: string]: Prisma.Decimal | null } },
        key: string,
      ): number => {
        const decimalValue = result._sum[key];
        return decimalValue ? decimalValue.toNumber() : 0;
      };

      const responseData = {
        totalRevenue: getSum(totalRevenueResult as any, 'paid_amount'),
        lastMonthRevenue: getSum(lastMonthRevenueResult as any, 'paid_amount'),
        totalPayouts: getSum(totalPayoutsResult as any, 'amount'),
        lastMonthPayouts: getSum(lastMonthPayoutsResult as any, 'amount'),
      };

      return {
        success: true,
        message: 'Payment statistics retrieved successfully.',
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching payment states: ${error.message}`,
      };
    }
  }
}
