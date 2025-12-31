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
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { use } from 'passport';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('all-sessions')
  getAllSessions(@Req() req: any) {
    try {
      const userType = req.user.type;
      if (userType !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        return this.sessionsService.getAllSessions();
      }
    } catch (error) {}
  }

  @Patch('restrict-session/:id')
  restrictSession(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    try {
      const userType = req.user.type;
      console.log('user type from token', userType);
      if (userType !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        const reason = body.reason || 'No reason provided';
        return this.sessionsService.restrictAsession(id, reason);
      }
    } catch (error) {}
  }

  @Patch('unrestrict-session/:id')
  unrestrictSession(@Param('id') id: string, @Req() req: any) {
    try {
      const userType = req.user.type;
      console.log('user type from token', userType);
      if (userType !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        return this.sessionsService.unRestrictAsession(id);
      }
    } catch (error) {
      return {
        statusCode: 500,
        success: false,
      };
    }
  }

  @Delete('delete/:id')
  removeSession(@Param('id') id: string, @Req() req: any) {
    try {
      const userType = req.user.type;
      if (userType !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        return this.sessionsService.deleteSession(id);
      }
    } catch (error) {
      return {
        statusCode: 500,
        success: false,
      };
    }
  }

  // get all session states
  @Get('states')
  async getAllSessionStates() {
    const getAllStates = await this.sessionsService.findAllStates();
    return getAllStates;
  }
}
