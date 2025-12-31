import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Put, UseInterceptors, UploadedFiles, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { CreateSessionDto } from './dto/create-session-teacher.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { log } from 'console';
import { UpdateSessionDto } from './dto/update-session-teacher.dto';
import { acceptReqDto } from './dto/accept-req.dto';
import { use } from 'passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express/multer';

@Controller('teacher')
export class TeacherController {
        constructor(private readonly teacherService: TeacherService) { }

        @UseGuards(JwtAuthGuard)
        @Post('create-session')
        create(@Body() createSessionDto: CreateSessionDto,
                @Req() req: any) {
                const userId = req.user.userId;
                createSessionDto.user_id = userId;
                return this.teacherService.create(createSessionDto);
        }

        @Get('all-sessions')
        findAll() {
                return this.teacherService.findAll();
        }


        @Get('all-booked-sessions/:id')
        findAllBookedSessions(
                @Req() req: any
        ) {
                const userId = req.user.userId;
                return this.teacherService.getAllBookedSessionsForOneTeacher(userId);
        }

        @UseGuards(JwtAuthGuard)
        @Get('reschedule-requests')
        getAllRescheduleRequests(
                @Req() req: any
        ) {
                const userId = req.user.userId;
                return this.teacherService.getallRequestsForReschedule(userId);
        }


        @Get("allteacher")
        getAllTeachers() {
                return this.teacherService.getAllTeachers();
        }

        @UseGuards(JwtAuthGuard)
        @Get('my-sessions')
        mySessions(
                @Req() req: any
        ) {
                const id = req.user.userId;
                return this.teacherService.getAllSessionsForOneTeachers(id);
        }
        @UseGuards(JwtAuthGuard)
        @Get('my-ended-sessions')
        myEndedSessions(@Req() req: any) {
                const userId = req.user.userId;
                return this.teacherService.getallEndedSessionsForOneTeacher(userId);
        }

        @UseGuards(JwtAuthGuard)
        @Get('getAllMets')
        getAllMets(
                @Req() req: any
        ) {
                const userId = req.user.userId;
                return this.teacherService.getAllMaterialsWithSession(userId)
        }

     //   @UseGuards(JwtAuthGuard)
        @Get('my-reviews/:id')
        getMyReviews(@Param('id') id: string) {
                return this.teacherService.getRecentReviewsForTeacher(id);
        }

        @Get('my-sessions/:id')
        mySessionsForStudents(
                @Param('id') id: string
        ) {
                return this.teacherService.getAllSessionsForOneTeacher(id);
        }

        @Get('session/:id')
        findOne(@Param('id') id: string) {
                return this.teacherService.findOne(id);
        }


        @Get('get/:id')
        getOneTeacher(@Param('id') id: string) {
                return this.teacherService.getATeacherById(id);
        }

        @Get('materials/:sessionId')
        getMaterialsForSession(@Param('sessionId') sessionId: string) {
                return this.teacherService.getMaterialsForSession(sessionId);
        }

        @UseGuards(JwtAuthGuard)
        @Post('upload/:sessionId')
        @UseInterceptors(FilesInterceptor('materials'))
        async uploadMaterials(
                @Param('sessionId') sessionId: string,
                @UploadedFiles() files: Express.Multer.File[],
                @Req() req: any,
        ) {
                const userID = req.user.userId;

                try {
                        const result = await this.teacherService.uploadMaterials(userID, sessionId, files);

                        return {
                                success: result.success,
                                message: result.message,
                                fileNames: result.fileNames,
                                materials_urls: result.materials_urls,
                        };
                } catch (error) {
                        return {
                                success: false,
                                message: error.message,
                        };
                }
        }

        @UseGuards(JwtAuthGuard)
        @Post(':action/:requestId')
        async handleRescheduleRequest(
                @Param('action') action: string,
                @Param('requestId') requestId: string,
                @Body() acceptDto: acceptReqDto,
                @Req() req: any
        ) {
                if (action !== 'accept' && action !== 'reject') {
                        return { message: 'Invalid action. Please use "accept" or "reject".' };
                }

                const userId = req.user.userId;

                const result = await this.teacherService.handleRequest(
                        requestId,
                        userId,
                        action,
                        acceptDto,
                );
                return result;
        }


        @UseGuards(JwtAuthGuard)
        @Put('update-session/:id')
        async update(@Param('id') id: string,
                @Body() updateSessionDto: UpdateSessionDto,
                @Req() req: any) {
                const userId = req.user.userId;
                return this.teacherService.update(id, updateSessionDto, userId);
        }

        
        @UseGuards(JwtAuthGuard)
        @Patch('start-session/:id')
        async startSession(@Param('id') id: string, @Req() req: any) {
                const userId = req.user.userId;
                return this.teacherService.startASession(id, userId);
        }


        @UseGuards(JwtAuthGuard)
        @Delete('delete-session/:id')
        remove(@Param('id') id: string, @Req() req: any) {
                const userId = req.user.userId;
                return this.teacherService.remove(id, userId);
        }

        @UseGuards(JwtAuthGuard)
        @Delete(':sessionId/materials/:materialFileName')
        async deleteMaterialFromSession(
                @Param('sessionId') sessionId: string,
                @Param('materialFileName') materialFileName: string,
                @Req() req: any
        ) {
                const userId = req.user.userId;
                try {
                        const result = await this.teacherService.deleteMaterialFromSession(sessionId, materialFileName, userId);

                        if (result.success) {
                                return {
                                        message: result.message,
                                };
                        } else {
                                throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
                        }
                } catch (error) {
                        throw new HttpException(
                                error?.response?.message || 'An unexpected error occurred',
                                error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
                        );
                }
        }





}
