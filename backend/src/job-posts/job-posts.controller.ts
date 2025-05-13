import { Controller, Post, Put, Get, Body, Param, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
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
    @Body() body: { title: string; description: string; location: string; salary: number; status: 'Active' | 'Draft' | 'Closed'; category_id?: string },
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
    @Body() body: { title?: string; description?: string; location?: string; salary?: number; status?: 'Active' | 'Draft' | 'Closed'; category_id?: string },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobPostsService.updateJobPost(userId, jobPostId, body);
  }

  @Get(':id')
  async getJobPost(@Param('id') jobPostId: string) {
    return this.jobPostsService.getJobPost(jobPostId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-posts')
  async getJobPostsByEmployer(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobPostsService.getJobPostsByEmployer(userId);
  }
}