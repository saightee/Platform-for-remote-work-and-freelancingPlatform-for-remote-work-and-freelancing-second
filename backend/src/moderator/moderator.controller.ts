import { Controller, Get, Post, Delete, Param, Body, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ModeratorService } from './moderator.service';
import { JwtService } from '@nestjs/jwt';
import { ModeratorGuard } from '../auth/guards/moderator.guard';

@Controller('moderator')
export class ModeratorController {
  constructor(
    private moderatorService: ModeratorService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(ModeratorGuard)
  @Post('job-posts/:id/approve')
  async approveJobPost(
    @Param('id') jobPostId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const moderatorId = payload.sub;
    return this.moderatorService.approveJobPost(moderatorId, jobPostId);
  }

  @UseGuards(ModeratorGuard)
  @Post('job-posts/:id/flag')
  async flagJobPost(
    @Param('id') jobPostId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const moderatorId = payload.sub;
    return this.moderatorService.flagJobPost(moderatorId, jobPostId);
  }

  @UseGuards(ModeratorGuard)
  @Get('reviews')
  async getReviews(
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const moderatorId = payload.sub;
    return this.moderatorService.getReviews(moderatorId);
  }

  @UseGuards(ModeratorGuard)
  @Delete('reviews/:id')
  async deleteReview(
    @Param('id') reviewId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const moderatorId = payload.sub;
    return this.moderatorService.deleteReview(moderatorId, reviewId);
  }

  @UseGuards(ModeratorGuard)
  @Get('complaints')
  async getComplaints(
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const moderatorId = payload.sub;
    return this.moderatorService.getComplaints(moderatorId);
  }

  @UseGuards(ModeratorGuard)
  @Post('complaints/:id/resolve')
  async resolveComplaint(
    @Param('id') complaintId: string,
    @Body() body: { status: 'Resolved' | 'Rejected'; comment?: string },
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const moderatorId = payload.sub;
    return this.moderatorService.resolveComplaint(moderatorId, complaintId, body.status, body.comment);
  }
}