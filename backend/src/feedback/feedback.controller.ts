import { Controller, Post, Get, Body, Headers, UnauthorizedException, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { SubmitTechFeedbackDto } from './dto/submit-tech-feedback.dto';

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
    @Body() body: SubmitTechFeedbackDto & { message?: string },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    const dto: SubmitTechFeedbackDto = {
      category: body.category,
      summary: body.summary ?? body.message ?? '',
      steps_to_reproduce: body.steps_to_reproduce,
      expected_result: body.expected_result,
      actual_result: body.actual_result,
    };

    return this.feedbackService.submitFeedback(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getFeedback(
    @Headers('authorization') authHeader: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;

    const p = parseInt(page, 10);
    const l = parseInt(limit, 10);
    if (!Number.isFinite(p) || p < 1) throw new BadRequestException('Page must be a positive integer');
    if (!Number.isFinite(l) || l < 1) throw new BadRequestException('Limit must be a positive integer');

    return this.feedbackService.getFeedback(adminId, p, l);
  }
}