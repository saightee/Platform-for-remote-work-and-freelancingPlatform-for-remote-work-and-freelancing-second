import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { RedisService } from './redis/redis.service';
import vault from 'node-vault';

const session = require('express-session');
const connectRedis = require('connect-redis');
const RedisStore = connectRedis(session);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const redisService = app.get(RedisService);

  console.log('Redis Config:', {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT ?? '6380', 10),
    password: process.env.REDIS_PASSWORD ? '[hidden]' : 'undefined',
  });

  const redisClient = redisService.getClient();

  app.enableCors({
    origin: '*',
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });

  app.use(
    session({
      store: new RedisStore({
        client: redisClient,
        ttl: 24 * 60 * 60,
      }),
      secret: process.env.SESSION_SECRET || 'mySuperSecretSessionKey123!@#',
      resave: false,
      saveUninitialized: false,
      name: 'jobforge.sid',
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    }),
  );

  app.use('/Uploads', express.static('Uploads'));

  app.use((req, res, next) => {
    console.log('Session:', {
      sessionID: req.sessionID,
      user: req.session.user,
      cookies: req.headers.cookie,
    });
    next();
  });

  app.setGlobalPrefix('api');
  setInterval(() => redisService.cleanOldSessions(), 3600 * 1000);
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();