import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LeaderboardsService } from './leaderboards.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin/leaderboards')
export class LeaderboardsController {
  constructor(private readonly leaderboardsService: LeaderboardsService) {}

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('top-employers')
  async getTopEmployers(@Query('limit') limit: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.leaderboardsService.getTopEmployers(parsedLimit);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('top-jobseekers')
  async getTopJobseekers(@Query('limit') limit: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.leaderboardsService.getTopJobseekers(parsedLimit);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('top-employers-by-posts')
  async getTopEmployersByPosts(@Query('limit') limit: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.leaderboardsService.getTopEmployersByPosts(parsedLimit);
  }
}