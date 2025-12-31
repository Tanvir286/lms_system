import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Query,
  Redirect,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import appConfig from '../../config/app.config';
import { AuthGuard } from '@nestjs/passport';
import { LoginUserDto } from './dto/login-user.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { LinkedInAuthGuard } from './guards/linkedin-auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  // Create user start
  @ApiOperation({ summary: 'Register a user' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'certifications', maxCount: 3 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
      },
    ),
  )
  @Post('register')
  async create(
    @Body() data: CreateUserDto,

    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      certifications?: Express.Multer.File[];
    },
  ) {
    try {
      const avatar = files?.avatar?.[0];
      const certifications = files?.certifications;

      if (avatar) {
        data.avatar = avatar.path;
      }
      if (certifications && certifications.length > 0) {
        data.certifications = certifications.map((file) => file.path);
      }

      const { first_name, last_name, email, password, type } = data;

      // Basic validation
      if (!first_name)
        throw new HttpException(
          'First name not provided',
          HttpStatus.BAD_REQUEST,
        );
      if (!last_name)
        throw new HttpException(
          'Last name not provided',
          HttpStatus.BAD_REQUEST,
        );
      if (!email)
        throw new HttpException('Email not provided', HttpStatus.BAD_REQUEST);
      if (!password)
        throw new HttpException(
          'Password not provided',
          HttpStatus.BAD_REQUEST,
        );

      if (!data.type) {
        throw new HttpException(
          'User type is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!['student', 'teacher'].includes(data.type)) {
        throw new HttpException(
          'Invalid user type. Must be student, teacher or user',
          HttpStatus.BAD_REQUEST,
        );
      }

      const user = await this.authService.createUser(
        data,
        avatar,
        certifications,
      );

      return {
        success: true,
        message:
          'We have sent a verification link to your email. Please verify.',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Something went wrong',
      };
    }
  }

  @ApiOperation({ summary: 'Login user' })
  @Post('login')
  async login(@Body() data: LoginUserDto, @Res() res: Response) {
    try {
      const response = await this.authService.login(data);

      if (response.authorization && response.authorization.refresh_token) {
        res.cookie('refresh_token', response.authorization.refresh_token, {
          httpOnly: true,
          secure: true,
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        });
      }

      res.status(HttpStatus.OK).json(response);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Login failed due to an internal error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Get user details' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    try {
      const user_id = req.user.userId;

      const response = await this.authService.me(user_id);

      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch user details',
      };
    }
  }

  // refresh token
  @ApiOperation({ summary: 'Refresh token' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  async refreshToken(
    @Req() req: Request,
    @Body() body: { refresh_token: string },
  ) {
    try {
      const user_id = req.user.userId;

      const response = await this.authService.refreshToken(
        user_id,
        body.refresh_token,
      );

      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    try {
      const userId = req.user.userId;
      const response = await this.authService.revokeRefreshToken(userId);
      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Google login
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req) {
    return HttpStatus.OK;
  }

  // Route that Google will redirect to after login
  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const { user, loginResponse } = req.user;

    // Now, return the JWT tokens and the user info
    return res.json({
      message: 'Logged in successfully via Google',
      authorization: loginResponse.authorization,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
      },
    });
  }

  // update user
  // @ApiOperation({ summary: 'Update user' })
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @Patch('update')
  // @UseInterceptors(
  //   FileFieldsInterceptor(
  //     [
  //       { name: 'avatar', maxCount: 1 },
  //       { name: 'certifications', maxCount: 3 },
  //     ],
  //     {
  //       storage: memoryStorage(),
  //       limits: { fileSize: 5 * 1024 * 1024 },
  //     },
  //   ),
  //   // FileInterceptor('avatar', {
  //   // storage: diskStorage({
  //   //   destination:
  //   //     appConfig().storageUrl.rootUrl + appConfig().storageUrl.avatar,
  //   //   filename: (req, file, cb) => {
  //   //     const randomName = Array(32)
  //   //       .fill(null)
  //   //       .map(() => Math.round(Math.random() * 16).toString(16))
  //   //       .join('');
  //   //     return cb(null, `${randomName}${file.originalname}`);
  //   //   },
  //   // }),
  //   // storage: memoryStorage(),
  //   // }),
  // )
  // async updateUser(
  //   @Req() req: Request,
  //   @Body() data: UpdateUserDto,
  //   @UploadedFile() image: Express.Multer.File,
  //   certifications: Express.Multer.File[],
  // ) {
  //   try {
  //     const user_id = req.user?.userId;
  //     const user_type = req.user?.type;

  //     const response = await this.authService.updateUser(
  //       user_id,
  //       user_type,
  //       data,
  //       image,
  //       certifications,
  //     );
  //     return response;
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: 'Failed to update user',
  //     };
  //   }
  // }

  // update user
  @ApiOperation({ summary: 'Update user' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'certifications', maxCount: 3 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
      },
    ),
  )
  // FileInterceptor('avatar', {
  // storage: diskStorage({
  //   destination:
  //     appConfig().storageUrl.rootUrl + appConfig().storageUrl.avatar,
  //   filename: (req, file, cb) => {
  //     const randomName = Array(32)
  //       .fill(null)
  //       .map(() => Math.round(Math.random() * 16).toString(16))
  //       .join('');
  //     return cb(null, `${randomName}${file.originalname}`);
  //   },
  // }),
  // storage: memoryStorage(),
  // }),
  async updateUser(
    @Req() req: Request,
    @Body() data: UpdateUserDto,
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File;
      certifications?: Express.Multer.File[];
    },
  ) {
    try {
      const user_id = req.user?.userId;
      const user_type = req.user?.type;

      const image = files?.avatar ? files.avatar[0] : undefined;
      const certifications = files?.certifications
        ? files.certifications
        : undefined;

      const response = await this.authService.updateUser(
        user_id,
        user_type,
        data,
        image,
        certifications,
      );
      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update user',
      };
    }
  }

  // --------------change password---------

  @ApiOperation({ summary: 'Forgot password' })
  @Post('forgot-password')
  async forgotPassword(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.forgotPassword(email);
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  // verify email to verify the email
  @ApiOperation({ summary: 'Verify email and redirect user' })
  @Get('verify-email')
  async verifyEmail(@Query() data: VerifyEmailDto, @Res() res: Response) {
    try {
      const response = await this.authService.verifyEmail({
        email: data.email,
        token: data.token,
        type: data.type,
      });

      if (response.success) {
        let redirectUrl = 'https://evolve-lms.netlify.app/login';
        const userType = response.data?.user_type;

        if (userType === 'teacher') {
          redirectUrl = 'https://evolve-lms.netlify.app/tutor/sign-in';
        } else if (userType === 'student') {
          redirectUrl = 'https://evolve-lms.netlify.app/student/sign-in';
        }

        return res.redirect(redirectUrl);
      } else {
        const errorMessage = encodeURIComponent(response.message);
        return res.redirect(
          `https://evolve-lms.netlify.app/verification-failed?error=${errorMessage}`,
        );
      }
    } catch (error) {
      const errorMessage = encodeURIComponent('An unexpected error occurred.');
      return res.redirect(
        `https://evolve-lms.netlify.app/verification-failed?error=${errorMessage}`,
      );
    }
  }

  // resend verification email to verify the email
  @ApiOperation({ summary: 'Resend verification email' })
  @Post('resend-verification-email')
  async resendVerificationEmail(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.resendVerificationEmail(email);
    } catch (error) {
      return {
        success: false,
        message: 'Failed to resend verification email',
      };
    }
  }

  // reset password if user forget the password
  @ApiOperation({ summary: 'Reset password' })
  @Post('reset-password')
  async resetPassword(
    @Body() data: { email: string; token: string; password: string },
  ) {
    try {
      const email = data.email;
      const token = data.token;
      const password = data.password;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!password) {
        throw new HttpException(
          'Password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.resetPassword({
        email: email,
        token: token,
        password: password,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  // change password if user want to change the password
  @ApiOperation({ summary: 'Change password' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: Request,
    @Body() data: { email: string; old_password: string; new_password: string },
  ) {
    try {
      // const email = data.email;
      const user_id = req.user.userId;

      const oldPassword = data.old_password;
      const newPassword = data.new_password;
      // if (!email) {
      //   throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      // }
      if (!oldPassword) {
        throw new HttpException(
          'Old password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!newPassword) {
        throw new HttpException(
          'New password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.changePassword({
        // email: email,
        user_id: user_id,
        oldPassword: oldPassword,
        newPassword: newPassword,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Failed to change password',
      };
    }
  }

  // --------------end change password---------

  // -------change email address------
  @ApiOperation({ summary: 'request email change' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  async requestEmailChange(
    @Req() req: Request,
    @Body() data: { email: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.requestEmailChange(user_id, email);
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  // need to fix
  @ApiOperation({ summary: 'Change email address' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  async changeEmail(
    @Req() req: Request,
    @Body() data: { email: string; token: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;

      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.changeEmail({
        user_id: user_id,
        new_email: email,
        token: token,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }
  // -------end change email address------

  // --------- 2FA ---------
  @ApiOperation({ summary: 'Generate 2FA secret' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('generate-2fa-secret')
  async generate2FASecret(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.generate2FASecret(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Verify 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('verify-2fa')
  async verify2FA(@Req() req: Request, @Body() data: { token: string }) {
    try {
      const user_id = req.user.userId;
      const token = data.token;
      return await this.authService.verify2FA(user_id, token);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Enable 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('enable-2fa')
  async enable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.enable2FA(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('disable-2fa')
  async disable2FA(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      return await this.authService.disable2FA(user_id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  // --------- end 2FA ---------

  // LinkedIn login
  @Get('linkedin')
  @UseGuards(LinkedInAuthGuard)
  async linkedinAuth() {}

  // LinkedIn callback
  @Get('linkedin/redirect')
  @UseGuards(LinkedInAuthGuard)
  async linkedinAuthRedirect(@Req() req, @Res() res: Response) {
    const { user, loginResponse } = req.user;

    if (user.email.includes('@example.com')) {
      return res.redirect(
        `/complete-profile?user_id=${user.id}&access_token=${loginResponse.authorization.access_token}`,
      );
    }

    return res.json({
      message: 'Logged in successfully via LinkedIn',
      authorization: loginResponse.authorization,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
      },
    });
  }
}
