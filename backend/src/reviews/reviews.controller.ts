import { Controller, Post, Get, Param, Body, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private reviewsService: ReviewsService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createReview(
    @Headers('authorization') authHeader: string,
    @Body() body: { job_application_id: string; rating: number; comment?: string },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.reviewsService.createReview(userId, body.job_application_id, body.rating, body.comment);
  }

  @Get('user/:id')
  async getReviewsForUser(@Param('id') idOrSlug: string) {
    return this.reviewsService.getReviewsForUser(idOrSlug);
  }
}