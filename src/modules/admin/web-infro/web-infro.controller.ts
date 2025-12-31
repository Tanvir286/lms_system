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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { CreateWebInfroDto } from './dto/create-web-infro.dto';
import { WebInfroService } from './web-infro.service';
import { UpdateWebInfroDto } from './dto/update-web-infro.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateTeamInfoDto } from './dto/create-team-info.dto';

@Controller('web-infro')
export class WebInfroController {
  constructor(private readonly webInfroService: WebInfroService) {}

  @ApiOperation({ summary: 'Create a blog' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('create')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
    }),
  )
  async createBlog(
    @Req() req: any,
    @Body() data: CreateWebInfroDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    try {
      const userId = req.user.userId;
      const response = await this.webInfroService.createAblog(
        data,
        userId,
        image,
      );

      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create blog',
        error: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Create a blog' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('create-team')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
    }),
  )
  async createTeam(
    @Req() req: any,
    @Body() data: CreateTeamInfoDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    try {
      const userId = req.user.userId;
      const response = await this.webInfroService.createTeam(
        data,
        userId,
        image,
      );

      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create team member',
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('all-teams')
  getAllTeams(@Req() req: any) {
    const userId = req.user.userId;
    if (!userId) {
      return {
        status: 'error',
        message: 'User ID not found in request',
      };
    }
    return this.webInfroService.getAllTeams(userId);
  }

  @Get('public/teams')
  getPublicAllTeams() {
    return this.webInfroService.getPublicAllTeams();
  }

  @UseGuards(JwtAuthGuard)
  @Get('all-blogs')
  getAllBlogs(@Req() req: any) {
    const userId = req.user.userId;
    if (!userId) {
      return {
        status: 'error',
        message: 'User ID not found in request',
      };
    }
    return this.webInfroService.GetAllWebBlogs(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('remove/:id')
  async remove(@Param('id') id: string, @Req() req: any) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return {
          success: false,
          message: 'User ID is missing or not authenticated',
        };
      }

      const websiteInfo = await this.webInfroService.remove(id, userId);
      return websiteInfo;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
