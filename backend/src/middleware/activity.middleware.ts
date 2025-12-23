import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ActivityMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
    private configService: ConfigService, 
    private usersService: UsersService, 
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
        const userId = payload.sub;
        const role = payload.role as
          'jobseeker' | 'employer' | 'admin' | 'moderator' | 'affiliate';

        if (['jobseeker', 'employer', 'admin', 'moderator', 'affiliate'].includes(role)) {

          await this.redisService.extendOnlineStatus(userId, role);

          const throttleKey = `lastseen:write:${userId}`;
          const skip = await this.redisService.get(throttleKey);
          if (!skip) {
            try {
              await this.usersService.touchLastSeen(userId);
            } catch (e: any) {
            }
            await this.redisService.set(throttleKey, '1', 60);
          }

          if (!req.session.user || req.session.user.id !== userId) {
            req.session.user = { id: userId, email: payload.email, role };
            req.session.save((err) => {
              if (err) {
              } else {
              }
            });
          }
        } else {
        }
      } catch (error: any) {
      }
    } else {
    }
    next();
  }
}