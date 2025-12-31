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
import { HelpAndSupportService } from './help_and_support.service';
import { CreateHelpAndSupportDto } from './dto/create-help_and_support.dto';
import { UpdateHelpAndSupportDto } from './dto/update-help_and_support.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { use } from 'passport';

@Controller('help-and-support')
export class HelpAndSupportController {
  constructor(private readonly helpAndSupportService: HelpAndSupportService) {}

  // @UseGuards(JwtAuthGuard)
  @Post('support-message')
  createSupport(
 //   @Req() req: any,
    @Body() createHelpAndSupportDto: CreateHelpAndSupportDto,
  ) {
    // const userId = req?.user?.userId;
    // if (!userId) {
    //   return {
    //     success: false,
    //     message: 'Please login first',
    //   };
    // }
    try {
      return this.helpAndSupportService.createSupport(
        createHelpAndSupportDto,
        // userId,
      );
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred',
        error: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('all-support')
  getAllSupport(@Req() req: any) {
    const type = req.user.type;
    try {
      if (type !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        return this.helpAndSupportService.getAllSupport();
      }
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred',
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('all-reports')
  getAllReports(){
    return this.helpAndSupportService.getAllreports();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('toggle-support-status/:id')
  toggleSupportStatus(@Param('id') id: string) {
    return this.helpAndSupportService.toggleSupportStatus(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('one-support/:id')
  getOneSupport(@Param('id') id: string, @Req() req: any) {
    const type = req.user.type;
    const userId = req.user.userId;
    try {
      if (type !== 'admin') {
        return {
          success: false,
          message: 'unauthorized',
        };
      } else {
        return this.helpAndSupportService.getOneSupport(id);
      }
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred',
      };
    }
  }
}
