import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { RedisService } from './redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { RequestMethod } from '@nestjs/common';

const session = require('express-session');
const connectRedis = require('connect-redis');
const RedisStore = connectRedis(session);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const redisService = app.get(RedisService);
  const configService = app.get(ConfigService);
  const sessionSecret = configService.get('SESSION_SECRET');
  const port = configService.get('PORT');

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
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      name: 'sid',
      rolling: true,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: configService.get('NODE_ENV') === 'production',
        sameSite: 'lax',
      },
    }),
  );

  app.use('/Uploads', express.static('Uploads'));

  app.use((req, res, next) => {
    console.log('Session:', {
      sessionID: req.sessionID,
      user: (req as any).session?.user,
      cookies: req.headers.cookie,
    });
    next();
  });

  if (configService.get('ENABLE_PRERENDER') === '1') {
    const prerender = require('prerender-node');

    prerender
      .set('protocol', 'https')
      .set('ignoredQueryParameters', [
        'ref',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'gclid',
        'fbclid',
        'demo',
      ]);

    const token = configService.get('PRERENDER_TOKEN');
    const serviceUrl = configService.get('PRERENDER_SERVICE_URL');
    if (token) prerender.set('prerenderToken', token);
    if (serviceUrl) prerender.set('prerenderServiceUrl', serviceUrl);

    prerender.whitelisted(['^/$', '^/job/.*']);

    prerender.blacklisted([
      '^/api/.*',
      '^/socket\\.io/.*',
      '^/pgadmin-db.*',
      '\\.(js|css|map|png|jpg|jpeg|svg|webp|ico|gif|pdf)$',
      '^/Uploads/.*',
    ]);

    app.use((req, res, next) => {
      res.setHeader('Vary', 'User-Agent');
      next();
    });

    app.use(prerender);
    console.log('[prerender.io] enabled for /job/*');
  }

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'sitemap.xml', method: RequestMethod.GET },
      { path: 'robots.txt', method: RequestMethod.GET },
    ],
  });

  setInterval(() => redisService.cleanOldSessions(), 3600 * 1000);
  await app.listen(port);
}

bootstrap();