import { Controller, Get, Post, Delete, Param, Body, Headers, UnauthorizedException, UseGuards, Query, BadRequestException,  } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModeratorService } from './moderator.service';
import { JwtService } from '@nestjs/jwt';
import { ModeratorGuard } from '../auth/guards/moderator.guard';
import { PlatformFeedbackService } from '../platform-feedback/platform-feedback.service';
import { User } from '../users/entities/user.entity';


@Controller('moderator')
export class ModeratorController {
  private async checkModeratorRole(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
      throw new UnauthorizedException('Only moderators or admins can access this resource');
    }
  }
  constructor(
    private moderatorService: ModeratorService,
    private jwtService: JwtService,
    private platformFeedbackService: PlatformFeedbackService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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


  @UseGuards(ModeratorGuard)
  @Get('job-posts')
  async getJobPosts(
    @Query('status') status: 'Active' | 'Draft' | 'Closed',
    @Query('pendingReview') pendingReview: string,
    @Query('title') title: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const moderatorId = payload.sub;

    const filters: {
      status?: 'Active' | 'Draft' | 'Closed';
      pendingReview?: boolean;
      title?: string;
      page?: number;
      limit?: number;
    } = {};
    if (status) {
      filters.status = status;
    }
    if (pendingReview !== undefined) {
      filters.pendingReview = pendingReview === 'true';
    }
    if (title) {
      filters.title = title;
    }
    if (page) {
      const parsedPage = parseInt(page, 10);
      if (isNaN(parsedPage) || parsedPage < 1) {
        throw new BadRequestException('Page must be a positive integer');
      }
      filters.page = parsedPage;
    }
    if (limit) {
      const parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        throw new BadRequestException('Limit must be a positive integer');
      }
      filters.limit = parsedLimit;
    }

    return this.moderatorService.getJobPosts(moderatorId, filters);
  }

  @Get('platform-feedback')
  @UseGuards(ModeratorGuard)
  async getPlatformFeedback(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const moderatorId = payload.sub;
    await this.checkModeratorRole(moderatorId);
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      throw new BadRequestException('Page must be a positive integer');
    }
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('Limit must be a positive integer');
    }
    return this.platformFeedbackService.getPublicFeedback(parsedPage, parsedLimit);
  }

  @Delete('platform-feedback/:id')
  @UseGuards(ModeratorGuard)
  async deletePlatformFeedback(
    @Param('id') feedbackId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const moderatorId = payload.sub;
    await this.checkModeratorRole(moderatorId);
    const feedback = await this.platformFeedbackService.deleteFeedback(feedbackId);
    return feedback;
  }
}