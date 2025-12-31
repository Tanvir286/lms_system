import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class SchedulerService {

  constructor(private readonly prisma: PrismaService) { }
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleHourlyCron() {
    const now = new Date();
    console.log('Cron executed at:', now);

    const sessionsToUpdate = await this.prisma.book_Session.findMany({
      where: {
        is_joined: 1,
        is_completed: 0,
        session_date: {
          lte: new Date(now.getTime() - 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        session_date: true,
        create_session: {
          select: { id: true },
        },
      },
    });

    for (const session of sessionsToUpdate) {
      const sessionDate = new Date(session.session_date);
      const oneHourInMillis = 60 * 60 * 1000;

      const endedAt = new Date(sessionDate.getTime() + oneHourInMillis);

      await this.prisma.book_Session.update({
        where: { id: session.id },
        data: {
          is_completed: 1,
          status: "completed",
          session_period: "60",
          ended_at: endedAt,
        },
      });

      console.log(`Book session ${session.id} marked as completed.`);

      if (session.create_session?.id) {
        await this.prisma.create_Session.update({
          where: { id: session.create_session.id },
          data: {
            is_completed: 1,
          },
        });

        console.log(`Create session ${session.create_session.id} marked as completed.`);
      }
    }
  }


}
