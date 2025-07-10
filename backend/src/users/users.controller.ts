import { Controller, Get, Param, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { RedisService } from '../redis/redis.service';
import { NotFoundException } from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private redisService: RedisService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/online')
  async getUserOnlineStatus(
    @Param('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    if (!['jobseeker', 'employer', 'admin', 'moderator'].includes(payload.role)) {
      throw new UnauthorizedException('Only jobseekers, employers, admins, or moderators can check online status');
    }
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const role = await this.redisService.get(`online:${userId}`);
    return { userId, isOnline: !!role, role };
  }
}