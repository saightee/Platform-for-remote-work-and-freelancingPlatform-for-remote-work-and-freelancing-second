import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as express from 'express'; // Добавляем для раздачи статических файлов

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Настройка express-session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'mySuperSecretSessionKey123!@#',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 600000 }, // 10 минут
    }),
  );

  // Раздача статических файлов из папки uploads
  app.use('/uploads', express.static('uploads'));

  // Middleware для отладки сессии
  app.use((req, res, next) => {
    console.log('Session:', req.session);
    next();
  });

  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();