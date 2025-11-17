import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { AffiliatesService } from './affiliates.service';

@Controller('affiliates')
export class AffiliatesController {
  constructor(
    private affiliatesService: AffiliatesService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMyProfile(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload: any = this.jwtService.verify(token);

    if (payload.role !== 'affiliate') {
      throw new UnauthorizedException('Only affiliates can access this resource');
    }

    const profile = await this.affiliatesService.getProfileByUserId(payload.sub);
    return profile;
  }
}
