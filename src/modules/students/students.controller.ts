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
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReqDto } from './dto/req.dto';
import { StudentRatingDto } from './dto/student-rating.dto';
import { log } from 'console';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) { }

  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/sessions')
  findAll(@Req() req: any) {
    const userId = req.user.userId;
    return this.studentsService.getAllBookedSessionsForStudent(userId);
  }

  @Get('allstudents')
  getAllStudents() {
    return this.studentsService.getAllStudents();
  }

  // eta dekhte hobe
  @UseGuards(JwtAuthGuard)
  @Get('completed-sessions')
  getAllCompletedSessionsForStudent(@Req() req: any) {
    const id = req.user.userId;
    return this.studentsService.getAllCompletedSessionsForStudent(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/sessionss')
  findAllMaterials(@Req() req: any) {
    const userId = req.user.userId;
    return this.studentsService.getAllBookedSessionsMaterialsForStudent(userId);
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return this.studentsService.getAStudentById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('join-session/:sessionId')
  async joinSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.studentsService.joinsession(userId, sessionId);
  }

  @Post('sessions/:sessionId/book')
  @UseGuards(JwtAuthGuard)
  async bookSession(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
    @Body() createStudentDto: CreateStudentDto,
  ) {
    try {
      const userId = req.user.userId;
      return this.studentsService.bookASession(
        sessionId,
        userId,
        createStudentDto,
      );
    } catch (error) {
      console.error('Error in bookSession controller:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(`Unexpected error: ${error.message || error}`);
    }
  }

  // cancel session baki ache
  @Patch('cancel-session/:sessionId')
  @UseGuards(JwtAuthGuard)
  async cancelSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.studentsService.cancellSession(userId, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':sessionId/reschedule')
  async requestRescheduleSession(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
    @Body() body: ReqDto,
  ) {
    try {
      const userId = req.user.userId;
      const response = await this.studentsService.requestRescheduleSession(
        body,
        sessionId,
        userId,
      );
      return response;
    } catch (error) {
      console.error('Error in requestRescheduleSession controller:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(`Unexpected error: ${error.message || error}`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('rateASession/:sessionID')
  async rateASession(
    @Param('sessionID') bookSessionID: string,
    @Req() req: any,
    @Body() body: StudentRatingDto,
  ) {
    try {
      const userId = req.user.userId;
      console.log('bookSessionID:', bookSessionID);
      console.log('userId:', userId);
      const response = await this.studentsService.rateASession(
        body,
        bookSessionID,
        userId,
      );
      
      return response;
    } catch (error) {
      console.error('Error in rateASession controller:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(`Unexpected error: ${error.message || error}`);
    }
  }
}
