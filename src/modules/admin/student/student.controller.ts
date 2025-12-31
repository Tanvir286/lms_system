import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RestrictedUserDto } from './dto/restricted-user.dto';
import { stat } from 'fs';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('all-students')
  getAllStudents(@Req() req: any) {
    const type = req.user.type;
    try {
      if (type !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        return this.studentService.getAllstudetnds(type);
      }
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred while deleting the user.',
        error: error.message,
      };
    }
  }

  @Get('book-sessions')
  findAll(@Req() req: any) {
    const type = req.user.type;
    try {
      if (type !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        return this.studentService.getAllstudetnds(type);
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
        return this.studentService.getRestrictedUsers();
      }
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred while fetching restricted users.',
        error: error.message,
      };
    }
  }

  @Get('student/:id')
  getOneStudent(@Param('id') id: string) {
    return this.studentService.getOneStudent(id);
  }

  @Patch('restricted-user/:restrictedId')
  restrictedUserAccess(
    @Param('restrictedId') restrictedId: string,
    @Body() dto: RestrictedUserDto,
    @Req() req: any,
  ) {
    const type = req.user.type;
    try {
      if (type !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        return this.studentService.restrictedUserAccess(
          type,
          restrictedId,
          dto.restriction_period,
          dto.restriction_reason,
        );
      }
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred while restricting the user.',
        error: error.message,
      };
    }
  }

  @Patch('unrestrict-user/:userId')
  unrestrictUser(@Param('userId') userId: string, @Req() req: any) {
    const type = req.user.type;
    try {
      if (type !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        return this.studentService.unrestrictAUser(type, userId);
      }
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred while unrestricting the user.',
        error: error.message,
      };
    }
  }

  // Get all student states
  @Get('states')
  async getAllStudentStates() {
    const allStudentStates = await this.studentService.findAllStudentStates();
    return allStudentStates;
  }

  // Get a student states
  @Get('states/:id')
  async getAStudentStates(@Param('id') userId: string) {
    const getAStudentStates =
      await this.studentService.findAStudentStates(userId);
    return getAStudentStates;
  }

  // Get a student all session info
  @Get('session-info/:id')
  async getAStudentAllSession(@Param('id') userId: string) {
    const getAStudentStates =
      await this.studentService.findAStudentAllSession(userId);
    return getAStudentStates;
  }

  @Delete(':id')
  remove(@Param('id') userId: string, @Req() req: any) {
    const type = req.user.type;
    try {
      if (type !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        return this.studentService.delete(userId, type);
      }
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred while deleting the user.',
        error: error.message,
      };
    }
  }
}
