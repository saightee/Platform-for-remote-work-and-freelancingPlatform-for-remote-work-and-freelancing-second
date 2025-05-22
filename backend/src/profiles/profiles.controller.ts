import { Controller, Get, Put, Post, Headers, UnauthorizedException, Body, Param, UseGuards } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Controller('profile')
export class ProfilesController {
  constructor(
    private profilesService: ProfilesService,
    private jwtService: JwtService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.profilesService.getProfile(userId);
  }

  @Put()
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(
    @Headers('authorization') authHeader: string,
    @Body() body: any,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    return this.profilesService.updateProfile(userId, body);
  }

  @Post('upload-avatar')
  @UseGuards(AuthGuard('jwt'))
  async uploadAvatar(
    @Headers('authorization') authHeader: string,
    @Body('avatarUrl') avatarUrl: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    return this.profilesService.uploadAvatar(userId, avatarUrl);
  }

  @Post('upload-identity')
  @UseGuards(AuthGuard('jwt'))
  async uploadIdentity(
    @Headers('authorization') authHeader: string,
    @Body('documentUrl') documentUrl: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    return this.profilesService.uploadIdentityDocument(userId, documentUrl);
  }
}