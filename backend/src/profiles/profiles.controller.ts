import { Controller, Get, Put, Body, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Controller('profile')
export class ProfilesController {
  constructor(
    private profilesService: ProfilesService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getProfile(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.profilesService.getProfile(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put()
  async updateProfile(
    @Headers('authorization') authHeader: string,
    @Body() body: { role: 'employer' | 'jobseeker'; company_name?: string; company_info?: string; referral_link?: string; skills?: string[]; experience?: string; portfolio?: string; video_intro?: string; timezone?: string; currency?: string },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.profilesService.updateProfile(userId, body.role, body);
  }
}