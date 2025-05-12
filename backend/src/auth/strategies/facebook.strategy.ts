import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

//@Injectable()
//export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
 // constructor(configService: ConfigService) {
 //   super({
  //    clientID: configService.get<string>('FACEBOOK_APP_ID'),
  //    clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
  //    callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL'),
   //   scope: ['email'], // Запрашиваем email
   //   profileFields: ['id', 'emails', 'name'], // Запрашиваем необходимые поля
   // });
  //}

  //async validate(
  //  accessToken: string,
  //  refreshToken: string,
  //  profile: any,
  //  done: (err: any, user: any) => void,
  //): Promise<any> {
  //  console.log('Facebook Profile:', profile);
  //  const { emails, displayName } = profile;
   // if (!emails || emails.length === 0) {
  //    console.error('Facebook OAuth - No email found in profile');
   //   return done(new Error('No email found'), null);
   // }
   // const user = {
   //   email: emails[0].value,
   //   username: displayName || emails[0].value.split('@')[0],
   //   provider: 'facebook',
   // };
   // console.log('Facebook User Extracted:', user);
   // done(null, user);
  //}
//}