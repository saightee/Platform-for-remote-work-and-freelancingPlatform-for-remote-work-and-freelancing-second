import { Controller, Post, Get, Body, Query, Headers, UseGuards, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PlatformFeedbackService } from './platform-feedback.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Controller('platform-feedback')
export class PlatformFeedbackController {
  constructor(
    private platformFeedbackService: PlatformFeedbackService,
    private jwtService: JwtService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createFeedback(
    @Body() body: { rating: number; description: string },
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.platformFeedbackService.createFeedback(userId, body.rating, body.description);
  }

  @Get()
  async getPublicFeedback(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
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
}