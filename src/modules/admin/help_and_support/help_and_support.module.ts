import { Module } from '@nestjs/common';
import { HelpAndSupportService } from './help_and_support.service';
import { HelpAndSupportController } from './help_and_support.controller';

@Module({
  controllers: [HelpAndSupportController],
  providers: [HelpAndSupportService],
})
export class HelpAndSupportModule {}
