import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';
import { ContactModule } from './contact/contact.module';
import { WebsiteInfoModule } from './website-info/website-info.module';
import { PaymentTransactionModule } from './payment-transaction/payment-transaction.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { StudentModule } from './student/student.module';
import { TutorModule } from './tutor/tutor.module';
import { SessionsModule } from './sessions/sessions.module';
import { HelpAndSupportModule } from './help_and_support/help_and_support.module';
import { WebInfroModule } from './web-infro/web-infro.module';

@Module({
  imports: [
    FaqModule,
    ContactModule,
    WebsiteInfoModule,
    PaymentTransactionModule,
    UserModule,
    NotificationModule,
    StudentModule,
    TutorModule,
    SessionsModule,
    HelpAndSupportModule,
    WebInfroModule,
  ],
})
export class AdminModule {}
