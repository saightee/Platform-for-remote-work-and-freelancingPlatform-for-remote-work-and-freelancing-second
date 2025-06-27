import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';
import connectRedis from 'connect-redis';
import * as express from 'express';
import { RedisService } from './redis/redis.service';

type RedisStoreConstructor = new (options: { client: any; ttl?: number }) => session.Store;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const redisService = app.get(RedisService);

  console.log('Redis Config:', {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ? '[hidden]' : 'undefined',
  });

  const redisClient = redisService.getClient();

  const RedisStore = (connectRedis as any)(session) as RedisStoreConstructor;

  app.use(
    session({
      store: new RedisStore({
        client: redisClient,
        ttl: 300,
      }),
      secret: process.env.SESSION_SECRET || 'mySuperSecretSessionKey123!@#',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 300000, 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    }),
  );

  app.use('/uploads', express.static('uploads'));

  app.use((req, res, next) => {
    console.log('Session:', req.sessionID, 'User:', req.session.user, 'Cookies:', req.headers.cookie);
    next();
  });

  app.setGlobalPrefix('api');
  setInterval(() => redisService.cleanOldSessions(), 3600 * 1000);
  await app.listen(process.env.PORT ?? 3000);
}



bootstrap();