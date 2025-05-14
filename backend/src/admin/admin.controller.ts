import { Controller, Get, Post, Put, Delete, Headers, UnauthorizedException, UseGuards, Param, Body, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('users')
  async getUsers(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.adminService.getUsers(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users/:id')
  async getUser(@Headers('authorization') authHeader: string, @Param('id') userId: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;
    return this.adminService.getUser(userIdAdmin, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('users/:id')
  async updateUser(
    @Headers('authorization') authHeader: string,
    @Param('id') userId: string,
    @Body() body: { email?: string; username?: string; role?: 'employer' | 'jobseeker' | 'admin' },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;
    return this.adminService.updateUser(userIdAdmin, userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('users/:id')
  async deleteUser(@Headers('authorization') authHeader: string, @Param('id') userId: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;
    return this.adminService.deleteUser(userIdAdmin, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('job-posts')
  async getJobPosts(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.adminService.getJobPosts(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('job-posts/:id')
  async updateJobPost(
    @Headers('authorization') authHeader: string,
    @Param('id') jobPostId: string,
    @Body() body: { title?: string; description?: string; location?: string; salary?: number; status?: 'Active' | 'Draft' | 'Closed'; job_type?: 'Full-time' | 'Part-time' | 'Project-based'; category_id?: string; applicationLimit?: number },
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.adminService.updateJobPost(userId, jobPostId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('job-posts/:id')
  async deleteJobPost(@Headers('authorization') authHeader: string, @Param('id') jobPostId: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.adminService.deleteJobPost(userId, jobPostId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('reviews')
  async getReviews(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.adminService.getReviews(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('reviews/:id')
  async deleteReview(@Headers('authorization') authHeader: string, @Param('id') reviewId: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.adminService.deleteReview(userId, reviewId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('analytics')
  async getAnalytics(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.adminService.getAnalytics(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('job-posts/:id/set-application-limit')
  async setApplicationLimit(
    @Headers('authorization') authHeader: string,
    @Param('id') jobPostId: string,
    @Body('limit') limit: number,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.adminService.setApplicationLimit(userId, jobPostId, limit);
  }
}