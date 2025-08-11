import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-linkedin-oauth2';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('LINKEDIN_CLIENT_ID'),
      clientSecret: configService.get<string>('LINKEDIN_CLIENT_SECRET'),
      callbackURL: configService.get<string>('LINKEDIN_CALLBACK_URL'),
      scope: ['r_emailaddress', 'r_liteprofile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: Function,
  ): Promise<any> {
    const { emails, displayName } = profile;
    const user = {
      email: emails[0].value,
      username: displayName,
      provider: 'linkedin',
    };
    done(null, user);
  }
}