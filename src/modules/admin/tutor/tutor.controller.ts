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
  Put,
} from '@nestjs/common';
import { TutorService } from './tutor.service';
import { CreateTutorDto } from './dto/create-tutor.dto';
import { UpdateTutorDto } from './dto/update-tutor.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RestrictUserDto } from './dto/restrict-user.dto';
import { AuthService } from 'src/modules/auth/auth.service';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('tutor')
export class TutorController {
  constructor(private readonly tutorService: TutorService) {}

  @Get('all')
  findAll(@Req() req: any) {
    const type = req.user.type;
    try {
      if (type !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        return this.tutorService.getAllTutors(type);
      }
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred while deleting the user.',
        error: error.message,
      };
    }
  }

  @Get('restricted-users')
  getRestrictedUsers(@Req() req: any) {
    const type = req.user.type;
    try {
      if (type !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        return this.tutorService.getAllRestrictedTeacher(type);
      }
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred while deleting the user.',
        error: error.message,
      };
    }
  }

  // Tutor States
  @Get('stats')
  async getTutorStates() {
    const tutorInfoCount = await this.tutorService.findTutorStates();
    return tutorInfoCount;
  }

  //Tutor session States
  @Get('session-stats/:id')
  async getTutorSessionStates(@Param('id') id: string) {
    const tutorInfoCount = await this.tutorService.findTutorSessionStates(id);
    return tutorInfoCount;
  }

  //tutor all session info
  @Get('session-info/:id')
  async getTutorSessionInfo(@Param('id') id: string) {
    const tutorInfoCount = await this.tutorService.findTutorSessionInfo(id);
    return tutorInfoCount;
  }

  @Get('/applications')
  getTutorApplications() {
    return this.tutorService.getAllTutorApplications();
  }

  @Get('/application/:id')
  getTutorApplicationById(@Param('id') id: string) {
    return this.tutorService.getOneTutorApplication(id);
  }

  @Get('/accepted-tutors')
  getallacceptedTutors() {
    return this.tutorService.getAllAcceptedTutors();
  }

  @Patch('/acceptApp/:id')
  acceptTutorApplication(@Param('id') id: string) {
    return this.tutorService.acceptTutorApplication(id);
  }

  @Patch('/rejectApp/:id')
  rejectTutorApplication(@Param('id') id: string) {
    return this.tutorService.rejectTutorApplication(id);
  }
}
