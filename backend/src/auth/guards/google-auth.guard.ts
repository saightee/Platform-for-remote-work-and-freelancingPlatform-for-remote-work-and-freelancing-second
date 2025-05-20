import { Injectable, ExecutionContext, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private redisService: RedisService) {
    super({
      state: true, // Включаем state
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const role = request.query.role;
    console.log('GoogleAuthGuard - Role from Query:', role);
    if (!role || !['employer', 'jobseeker'].includes(role)) {
      throw new BadRequestException('Invalid or missing role');
    }

    // Сохраняем role в Redis с временным ключом
    const tempId = uuidv4();
    console.log('GoogleAuthGuard - Saving to Redis:', `temp-auth:${tempId}`, role);
    await this.redisService.set(`temp-auth:${tempId}`, role, 600); // Храним 10 минут

    // Проверяем, что значение сохранено
    const savedRole = await this.redisService.get(`temp-auth:${tempId}`);
    console.log('GoogleAuthGuard - Retrieved from Redis:', savedRole);

    // Сохраняем tempId в сессии
    request.session.tempId = tempId;
    console.log('GoogleAuthGuard - Session tempId:', request.session.tempId);

    return super.canActivate(context) as Promise<boolean>;
  }

  getRequest(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    return request;
  }
}