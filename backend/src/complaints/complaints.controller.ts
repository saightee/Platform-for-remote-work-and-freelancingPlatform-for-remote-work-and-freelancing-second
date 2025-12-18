import { Controller, Post, Body, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

interface CreateComplaintDto {
  job_post_id?: string;
  profile_id?: string;
  reason: string;
}

@Controller('complaints')
export class ComplaintsController {
  constructor(
    private complaintsService: ComplaintsService,
    private jwtService: JwtService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createComplaint(
    @Headers('authorization') authHeader: string,
    @Body() body: CreateComplaintDto,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    return this.complaintsService.createComplaint(
      userId,
      body.job_post_id || null,
      body.profile_id || null,
      body.reason,
    );
  }
}