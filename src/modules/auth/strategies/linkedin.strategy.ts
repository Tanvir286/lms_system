import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import appConfig from '../../../config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { Strategy } from 'passport-google-oauth20';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {
    super({
      clientID: appConfig().auth.linkedin.client_id,
      clientSecret: appConfig().auth.linkedin.client_secret,
      callbackURL: appConfig().auth.linkedin.callback,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    const { id, emails, name, photos } = profile;

    let user = await this.prisma.user.findUnique({
      where: { linkedinId: id },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          linkedinId: id,
          email: emails[0].value,
          firstName: name?.givenName || '',
          lastName: name?.familyName || '',
          picture: photos[0]?.value || '',
          accessToken,
          refreshToken,
        },
      });
    }

    const loginResponse = await this.authService.authenticateLinkedInUser({
      email: user.email,
      userId: user.id,
    });

    done(null, { user, loginResponse });
  }
}
