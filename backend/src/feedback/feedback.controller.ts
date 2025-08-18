import { Controller, Post, Get, Body, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
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