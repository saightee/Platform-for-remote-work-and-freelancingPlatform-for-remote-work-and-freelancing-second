import { Controller, Post, Get, Body, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Controller('feedback')
export class FeedbackController {
  constructor(
    private feedbackService: FeedbackService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async submitFeedback(
    @Headers('authorization') authHeader: string,
    @Body('message') message: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.feedbackService.submitFeedback(userId, message);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getFeedback(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;
    return this.feedbackService.getFeedback(adminId);
  }
}