import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import appConfig from 'src/config/app.config';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: async () => ({
        secret: appConfig().jwt.secret,
        signOptions: { expiresIn: appConfig().jwt.expiry },
      }),
    }),
    MailModule
  ],
  controllers: [StudentsController],
  providers: [StudentsService, JwtStrategy],
})
export class StudentsModule { }
