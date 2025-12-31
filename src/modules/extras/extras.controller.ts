import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExtrasService } from './extras.service';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateExtraDto } from './dto/create-reviews.dto';

@Controller('extras')
export class ExtrasController {
  constructor(private readonly extrasService: ExtrasService) {}

  @Post('report/:reported_id')
  @UseGuards(JwtAuthGuard)
  async createReport(
    @Param('reported_id') reportedId: string,
    @Body() createReportDto: CreateReportDto,
    @Req() req: any,
  ) {
    try {
      const reporterId = req.user.userId;
      return this.extrasService.createReport(
        createReportDto,
        reporterId,
        reportedId,
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post('review/:session_id')
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Param('session_id') session_id: string,
    @Body() createExtraDto: CreateExtraDto,
    @Req() req: any,
  ) {
    const studentId = req.user.userId;
    return this.extrasService.giveRatingToTeaher(
      createExtraDto,
      studentId,
      session_id,
    );
  }
}
