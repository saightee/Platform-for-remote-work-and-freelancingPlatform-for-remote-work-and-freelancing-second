import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { TalentsService } from './talents.service';

@Controller('talents')
export class TalentsController {
  constructor(private talentsService: TalentsService) {}

  @Get()
  async searchTalents(
    @Query('skills') skills: string | string[],
    @Query('skills[]') skillsBracket: string | string[],
    @Query('experience') experience: string,
    @Query('description') description: string,
    @Query('rating') rating: string,
    @Query('timezone') timezone: string,
    @Query('job_search_status') job_search_status: 'actively_looking' | 'open_to_offers' | 'hired',
    @Query('expected_salary_min') expected_salary_min: string,
    @Query('expected_salary_max') expected_salary_max: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sort_by') sort_by: 'average_rating' | 'profile_views',
    @Query('sort_order') sort_order: 'ASC' | 'DESC',
  ) {
    const filters: {
      skills?: string[];
      experience?: string;
      description?: string;
      rating?: number;
      timezone?: string;
      job_search_status?: 'actively_looking' | 'open_to_offers' | 'hired';
      expected_salary_min?: number;
      expected_salary_max?: number;
      page?: number;
      limit?: number;
      sort_by?: 'average_rating' | 'profile_views';
      sort_order?: 'ASC' | 'DESC';
    } = {};

    const collected = [
      ...(Array.isArray(skills) ? skills : skills ? [skills] : []),
      ...(Array.isArray(skillsBracket) ? skillsBracket : skillsBracket ? [skillsBracket] : []),
    ];
    if (collected.length) filters.skills = collected;

    if (experience) filters.experience = experience;
    if (description) filters.description = description;

    if (rating) {
      const parsedRating = parseFloat(rating);
      if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
        throw new BadRequestException('Rating must be between 0 and 5');
      }
      filters.rating = parsedRating;
    }

    if (timezone) filters.timezone = timezone;

    if (job_search_status) {
      const allowed = ['actively_looking', 'open_to_offers', 'hired'];
      if (!allowed.includes(job_search_status)) {
        throw new BadRequestException('job_search_status must be: actively_looking | open_to_offers | hired');
      }
      filters.job_search_status = job_search_status;
    }

    if (expected_salary_min !== undefined) {
      const v = parseFloat(expected_salary_min);
      if (!isNaN(v) && v >= 0) filters.expected_salary_min = v;
      else if (expected_salary_min) throw new BadRequestException('expected_salary_min must be a non-negative number');
    }
    if (expected_salary_max !== undefined) {
      const v = parseFloat(expected_salary_max);
      if (!isNaN(v) && v >= 0) filters.expected_salary_max = v;
      else if (expected_salary_max) throw new BadRequestException('expected_salary_max must be a non-negative number');
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