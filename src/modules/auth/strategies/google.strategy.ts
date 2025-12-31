import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import appConfig from '../../../config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {
    super({
      clientID: appConfig().auth.google.app_id,
      clientSecret: appConfig().auth.google.app_secret,
      callbackURL: appConfig().auth.google.callback,
      scope: ['email', 'profile', 'openid'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    let user = await this.prisma.user.findUnique({
      where: {
        googleId: id,
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          googleId: id,
          email: emails[0].value,
          firstName: name.givenName,
          lastName: name.familyName,
          picture: photos[0].value,
          accessToken,
          refreshToken,
        },
      });
    }

    const loginResponse = await this.authService.googleLogin({
      email: user.email,
      userId: user.id,
    });

    done(null, { user, loginResponse });
  }
}
