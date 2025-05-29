import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { TalentsService } from './talents.service';

@Controller('talents')
export class TalentsController {
  constructor(private talentsService: TalentsService) {}

  @Get()
  async searchTalents(
    @Query('skills') skills: string | string[],
    @Query('experience') experience: string,
    @Query('rating') rating: string,
    @Query('timezone') timezone: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sort_by') sort_by: 'average_rating' | 'profile_views',
    @Query('sort_order') sort_order: 'ASC' | 'DESC',
  ) {
    const filters: {
      skills?: string[];
      experience?: string;
      rating?: number;
      timezone?: string;
      page?: number;
      limit?: number;
      sort_by?: 'average_rating' | 'profile_views';
      sort_order?: 'ASC' | 'DESC';
    } = {};

    if (skills) {
      filters.skills = Array.isArray(skills) ? skills : [skills];
    }
    if (experience) {
      filters.experience = experience;
    }
    if (rating) {
      const parsedRating = parseFloat(rating);
      if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
        throw new BadRequestException('Rating must be between 0 and 5');
      }
      filters.rating = parsedRating;
    }
    if (timezone) {
      filters.timezone = timezone;
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
    if (sort_by) {
      if (!['average_rating', 'profile_views'].includes(sort_by)) {
        throw new BadRequestException('Sort_by must be average_rating or profile_views');
      }
      filters.sort_by = sort_by;
    }
    if (sort_order) {
      if (!['ASC', 'DESC'].includes(sort_order)) {
        throw new BadRequestException('Sort_order must be ASC or DESC');
      }
      filters.sort_order = sort_order;
    }

    return this.talentsService.searchTalents(filters);
  }
}