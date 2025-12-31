// external imports
import {
  Logger,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
// internal imports
import { SoftdeleteMiddleware } from './middleware/softdelete.middleware';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ log: [{ emit: 'event', level: 'query' }] });

    // this.logger.log(`Prisma v${Prisma.prismaVersion.client}`);
    // this.$on('query', (e) => this.logger.debug(`${e.query} ${e.params}`));

    // comment out this when seeding data using command line
    if (process.env.PRISMA_ENV == '1') {
      console.log('Prisma Middleware not called', process.env.PRISMA_ENV);
    } else {
      this.$use(SoftdeleteMiddleware);
     // console.log('Prisma Middleware called', process.env.PRISMA_ENV);
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
