import { Controller, Get, Put, Post, Body, Headers, UnauthorizedException, UseGuards, Param } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';

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

  @UseGuards(AuthGuard('jwt'))
  @Post('upload-avatar')
  async uploadAvatar(
    @Headers('authorization') authHeader: string,
    @Body('avatarUrl') avatarUrl: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    if (!avatarUrl) {
      throw new UnauthorizedException('Avatar URL is required');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.profilesService.uploadAvatar(userId, avatarUrl);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upload-identity')
  async uploadIdentityDocument(
    @Headers('authorization') authHeader: string,
    @Body('documentUrl') documentUrl: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    if (!documentUrl) {
      throw new UnauthorizedException('Document URL is required');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.profilesService.uploadIdentityDocument(userId, documentUrl);
  }
}

@Controller('admin/profile')
export class AdminProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post(':id/verify-identity')
  async verifyIdentity(@Param('id') userId: string, @Body('verify') verify: boolean) {
    if (typeof verify !== 'boolean') {
      throw new UnauthorizedException('Verify parameter must be a boolean');
    }
    return this.profilesService.verifyIdentity(userId, verify);
  }
}