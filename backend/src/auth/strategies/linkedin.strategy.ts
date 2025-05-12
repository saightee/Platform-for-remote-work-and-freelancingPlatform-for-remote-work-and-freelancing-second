import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-linkedin-oauth2';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor() {
    super({
      clientID: 'YOUR_LINKEDIN_CLIENT_ID', // Замени на свой LinkedIn Client ID
      clientSecret: 'YOUR_LINKEDIN_CLIENT_SECRET', // Замени на свой LinkedIn Client Secret
      callbackURL: 'http://localhost:3000/auth/linkedin/callback',
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