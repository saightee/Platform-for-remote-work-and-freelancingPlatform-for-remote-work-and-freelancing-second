import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || (() => { throw new Error('GOOGLE_CLIENT_ID is missing'); })();
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || (() => { throw new Error('GOOGLE_CLIENT_SECRET is missing'); })();
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || (() => { throw new Error('GOOGLE_CALLBACK_URL is missing'); })();

    console.log('GoogleStrategy - clientID:', clientID);
    console.log('GoogleStrategy - clientSecret:', clientSecret);
    console.log('GoogleStrategy - callbackURL:', callbackURL);

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: true,
      state: true, // Включаем state
    });
  }

  async validate(
    request: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    console.log('Google Profile:', profile);
    console.log('Request Query:', request.query);
    const { emails, displayName } = profile;
    if (!emails || emails.length === 0) {
      console.error('Google OAuth - No email found in profile');
      return done(new Error('No email found'), null);
    }

    // Извлекаем роль из state
    const state = request.query.state ? JSON.parse(request.query.state) : {};
    const role = state.role;
    console.log('GoogleStrategy - Retrieved Role from State:', role);
    if (!role || !['employer', 'jobseeker'].includes(role)) {
      console.error('Google OAuth - Invalid role:', role);
      return done(new Error('Invalid role'), null);
    }

    const user = {
      email: emails[0].value,
      username: displayName || emails[0].value.split('@')[0],
      provider: 'google',
      role: role as 'employer' | 'jobseeker',
    };
    console.log('Google User Extracted:', user);
    done(null, user);
  }
}