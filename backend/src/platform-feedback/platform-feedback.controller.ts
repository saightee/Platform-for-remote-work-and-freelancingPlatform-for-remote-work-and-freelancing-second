import { Controller, Post, Get, Body, Query, Headers, UseGuards, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PlatformFeedbackService } from './platform-feedback.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { SubmitSuccessStoryDto } from './dto/submit-success-story.dto';

@Controller('platform-feedback')
export class PlatformFeedbackController {
  constructor(
    private platformFeedbackService: PlatformFeedbackService,
    private jwtService: JwtService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Body() body: SubmitSuccessStoryDto,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Invalid token');
    const token = authHeader.replace('Bearer ', '');
    const { sub: userId } = this.jwtService.verify(token);
    return this.platformFeedbackService.createSuccessStory(userId, body);
  }

  @Get()
  async publicStories(@Query('page') page = '1', @Query('limit') limit = '10') {
    const p = parseInt(page, 10), l = parseInt(limit, 10);
    if (!Number.isFinite(p) || p < 1) throw new BadRequestException('Page must be a positive integer');
    if (!Number.isFinite(l) || l < 1) throw new BadRequestException('Limit must be a positive integer');
    return this.platformFeedbackService.getPublicStories(p, l);
  }
}