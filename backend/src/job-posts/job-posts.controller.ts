import { Controller, Post, Put, Get, Body, Param, Headers, UnauthorizedException, UseGuards, Query } from '@nestjs/common';
import { JobPostsService } from './job-posts.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Controller('job-posts')
export class JobPostsController {
  constructor(
    private jobPostsService: JobPostsService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createJobPost(
    @Headers('authorization') authHeader: string,
    @Body() body: { title: string; description: string; location: string; salary: number; status: 'Active' | 'Draft' | 'Closed'; category_id?: string; job_type?: 'Full-time' | 'Part-time' | 'Project-based' },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobPostsService.createJobPost(userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  async updateJobPost(
    @Headers('authorization') authHeader: string,
    @Param('id') jobPostId: string,
    @Body() body: { title?: string; description?: string; location?: string; salary?: number; status?: 'Active' | 'Draft' | 'Closed'; category_id?: string; job_type?: 'Full-time' | 'Part-time' | 'Project-based' },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobPostsService.updateJobPost(userId, jobPostId, body);
  }

  @Get('search') // Статический маршрут
  async searchJobPosts(
    @Query('title') title?: string,
    @Query('location') location?: string,
    @Query('salaryMin') salaryMin?: string,
    @Query('salaryMax') salaryMax?: string,
    @Query('job_type') job_type?: 'Full-time' | 'Part-time' | 'Project-based',
    @Query('category_id') category_id?: string,
  ) {
    const filters = { title, location, salaryMin, salaryMax, job_type, category_id };
    return this.jobPostsService.searchJobPosts(filters);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-posts') // Статический маршрут
  async getJobPostsByEmployer(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobPostsService.getJobPostsByEmployer(userId);
  }

  @Get(':id') // Динамический маршрут идёт последним
  async getJobPost(@Param('id') jobPostId: string) {
    return this.jobPostsService.getJobPost(jobPostId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/close')
  async closeJobPost(
    @Headers('authorization') authHeader: string,
    @Param('id') jobPostId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobPostsService.closeJobPost(userId, jobPostId);
  }
}