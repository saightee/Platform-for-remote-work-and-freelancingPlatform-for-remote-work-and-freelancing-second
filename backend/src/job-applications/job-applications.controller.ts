import { Controller, Post, Get, Put, Body, Param, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JobApplicationsService } from './job-applications.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Controller('job-applications')
export class JobApplicationsController {
  constructor(
    private jobApplicationsService: JobApplicationsService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async applyToJob(
    @Headers('authorization') authHeader: string,
    @Body('job_post_id') jobPostId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobApplicationsService.applyToJob(userId, jobPostId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-applications')
  async getMyApplications(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobApplicationsService.getMyApplications(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('job-post/:id')
  async getApplicationsForJobPost(
    @Headers('authorization') authHeader: string,
    @Param('id') jobPostId: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobApplicationsService.getApplicationsForJobPost(userId, jobPostId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  async updateApplicationStatus(
    @Headers('authorization') authHeader: string,
    @Param('id') applicationId: string,
    @Body('status') status: 'Pending' | 'Accepted' | 'Rejected',
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.jobApplicationsService.updateApplicationStatus(userId, applicationId, status);
  }
}