import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private redisService: RedisService,
  ) {
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
    console.log('Request Session:', request.session);
    const { emails, displayName } = profile;
    if (!emails || emails.length === 0) {
      console.error('Google OAuth - No email found in profile');
      return done(new Error('No email found'), null);
    }

    // Извлекаем tempId из сессии
    const tempId = request.session.tempId;
    console.log('GoogleStrategy - Extracted tempId from session:', tempId);
    if (!tempId) {
      console.error('Google OAuth - Missing tempId in session');
      return done(new Error('Missing tempId in session'), null);
    }

    // Извлекаем role из Redis
    console.log('GoogleStrategy - Fetching from Redis:', `temp-auth:${tempId}`);
    const role = await this.redisService.get(`temp-auth:${tempId}`);
    console.log('GoogleStrategy - Retrieved Role from Redis:', role);
    if (!role) {
      console.error('Google OAuth - Role not found in Redis');
      return done(new Error('Role not found in Redis'), null);
    }
    if (!['employer', 'jobseeker'].includes(role)) {
      console.error('Google OAuth - Invalid role:', role);
      return done(new Error('Invalid role'), null);
    }

    // Удаляем временный ключ из Redis
    await this.redisService.del(`temp-auth:${tempId}`);

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