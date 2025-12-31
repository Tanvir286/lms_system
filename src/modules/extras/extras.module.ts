import { Module } from '@nestjs/common';
import { ExtrasService } from './extras.service';
import { ExtrasController } from './extras.controller';

@Module({
  controllers: [ExtrasController],
  providers: [ExtrasService],
})
export class ExtrasModule {}
