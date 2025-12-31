import { Module } from '@nestjs/common';
import { WebInfroService } from './web-infro.service';
import { WebInfroController } from './web-infro.controller';

@Module({
  controllers: [WebInfroController],
  providers: [WebInfroService],
})
export class WebInfroModule {}
