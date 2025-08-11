import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ActivityMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
    private configService: ConfigService, 
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    console.log(`ActivityMiddleware: Обработка запроса, path=${req.path}, sessionID=${req.sessionID}`);
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'), 
        });
        const userId = payload.sub;
        const role = payload.role;
        if (['jobseeker', 'employer', 'admin', 'moderator'].includes(role)) {
          console.log(`ActivityMiddleware: Установка статуса онлайн для userId=${userId}, role=${role}, sessionID=${req.sessionID}`);
          await this.redisService.extendOnlineStatus(userId, role as 'jobseeker' | 'employer' | 'admin' | 'moderator');
          const ttl = await this.redisService.getClient().ttl(`online:${userId}`);
          console.log(`ActivityMiddleware: TTL для online:${userId} = ${ttl} секунд`);
          if (!req.session.user || req.session.user.id !== userId) {
            req.session.user = { id: userId, email: payload.email, role };
            req.session.save((err) => {
              if (err) {
                console.error(`ActivityMiddleware: Ошибка сохранения сессии для userId=${userId}, sessionID=${req.sessionID}, error=${err.message}`);
              } else {
                console.log(`ActivityMiddleware: Сессия обновлена для userId=${userId}, sessionID=${req.sessionID}`);
              }
            });
          }
        } else {
          console.warn(`ActivityMiddleware: Неверная роль role=${role}, userId=${userId}`);
        }
      } catch (error) {
        console.error(`ActivityMiddleware ошибка: userId=${req.session.user?.id || 'unknown'}, sessionID=${req.sessionID}, error=${error.message}`);
      }
    } else {
      console.log(`ActivityMiddleware: Нет валидного заголовка авторизации, sessionID=${req.sessionID}, headers=${JSON.stringify(req.headers)}`);
    }
    next();
  }
}