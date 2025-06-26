import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ActivityMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'mySuperSecretKey123!@#ForLocalDev2025',
        });
        const userId = payload.sub;
        const role = payload.role;
        if (['jobseeker', 'employer'].includes(role)) {
          await this.redisService.setUserOnline(userId, role as 'jobseeker' | 'employer');
        }
      } catch (error) {
        console.error('ActivityMiddleware error:', error.message);
      }
    }
    next();
  }
}