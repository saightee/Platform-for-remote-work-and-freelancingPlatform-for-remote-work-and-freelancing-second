import { Controller, Post, Put, Get, Body, Param, Headers, UnauthorizedException, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { JobPostsService } from './job-posts.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('job-posts')
export class JobPostsController {
  constructor(
    private jobPostsService: JobPostsService,
    private jwtService: JwtService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createJobPost(
    @Headers('authorization') authHeader: string,
    @Body() body: { 
      title: string; 
      description: string; 
      location: string; 
      salary: number; 
      status: 'Active' | 'Draft' | 'Closed'; 
      category_id?: string; 
      aiBrief?: string;
      job_type?: 'Full-time' | 'Part-time' | 'Project-based';
      salary_type?: 'per hour' | 'per month'; 
      excluded_locations?: string[]; 
    },
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
    @Body() body: { 
      title?: string; 
      description?: string; 
      location?: string; 
      salary?: number; 
      status?: 'Active' | 'Draft' | 'Closed'; 
      category_id?: string; 
      aiBrief?: string;
      job_type?: 'Full-time' | 'Part-time' | 'Project-based';
      salary_type?: 'per hour' | 'per month';  
      excluded_locations?: string[]; 
    },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobPostsService.updateJobPost(userId, jobPostId, body);
  }

  @Get()
  async searchJobPosts(
    @Query('title') title: string,
    @Query('location') location: string,
    @Query('job_type') job_type: 'Full-time' | 'Part-time' | 'Project-based',
    @Query('salary_min') salary_min: string,
    @Query('salary_max') salary_max: string,
    @Query('category_id') category_id: string,
    @Query('required_skills') required_skills: string | string[],
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sort_by') sort_by: 'created_at' | 'salary',
    @Query('sort_order') sort_order: 'ASC' | 'DESC',
    @Query('salary_type') salary_type: 'per hour' | 'per month',  
  ) {
    const filters: {
      title?: string;
      location?: string;
      job_type?: 'Full-time' | 'Part-time' | 'Project-based';
      salary_min?: number;
      salary_max?: number;
      category_id?: string;
      required_skills?: string[];
      page?: number;
      limit?: number;
      sort_by?: 'created_at' | 'salary';
      sort_order?: 'ASC' | 'DESC';
      salary_type?: 'per hour' | 'per month';  
    } = {};
  
    if (title) filters.title = title;
    if (location) filters.location = location;
    if (job_type) filters.job_type = job_type;
    if (salary_min) filters.salary_min = parseInt(salary_min, 10);
    if (salary_max) filters.salary_max = parseInt(salary_max, 10);
    if (category_id) filters.category_id = category_id;
    if (required_skills) {
      filters.required_skills = Array.isArray(required_skills) ? required_skills : [required_skills];
    }
    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);
    if (sort_by) filters.sort_by = sort_by;
    if (sort_order) filters.sort_order = sort_order;
    if (salary_type) filters.salary_type = salary_type;  

    return this.jobPostsService.searchJobPosts(filters);
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

  @Get(':id')
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

  @Post(':id/increment-view')
  async incrementJobView(@Param('id') jobPostId: string) {
  return this.jobPostsService.incrementJobView(jobPostId);
  }

  @UseGuards(AuthGuard('jwt'), ThrottlerGuard)
  @Post('generate-description')
  async generateDescription(
    @Headers('authorization') authHeader: string,
    @Body('aiBrief') aiBrief: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || user.role !== 'employer') {
      throw new UnauthorizedException('Only employers can generate descriptions');
    }
    return this.jobPostsService.generateDescription(aiBrief);
  }
}