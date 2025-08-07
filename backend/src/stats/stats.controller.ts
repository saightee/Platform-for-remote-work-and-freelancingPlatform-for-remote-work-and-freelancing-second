import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get()
  async getPublicStats() {
    return this.statsService.getPublicStats();
  }

  @Get('job-posts-by-main-categories')
  async getJobPostsByMainCategories() {
    return this.statsService.getJobPostsByMainCategories();
  }

  @Get('job-posts-by-subcategories')
  async getJobPostsBySubcategories() {
    return this.statsService.getJobPostsBySubcategories();
  }
}