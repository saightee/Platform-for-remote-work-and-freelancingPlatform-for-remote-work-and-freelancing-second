import { Controller, Get, Post, Put, Delete, Param, Query, Body, Headers, UnauthorizedException, UseGuards, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SettingsService } from '../settings/settings.service';

@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private settingsService: SettingsService,
    private jwtService: JwtService,
  ) {}

  @Get('users')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getUsers(
    @Query('username') username: string,
    @Query('email') email: string,
    @Query('createdAfter') createdAfter: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    const filters: { username?: string; email?: string; createdAfter?: string } = {};
    if (username) {
      filters.username = username;
    }
    if (email) {
      filters.email = email;
    }
    if (createdAfter) {
      filters.createdAfter = createdAfter;
    }

    return this.adminService.getUsers(userIdAdmin, filters);
  }

  @Get('users/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getUserById(
    @Param('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.getUserById(userIdAdmin, userId);
  }

  @Put('users/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async updateUser(
    @Param('id') userId: string,
    @Body() body: { email?: string; username?: string; role?: 'employer' | 'jobseeker' | 'admin' },
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.updateUser(userIdAdmin, userId, body);
  }

  @Delete('users/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async deleteUser(
    @Param('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.deleteUser(userIdAdmin, userId);
  }

  @Post('users/:id/reset-password')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async resetPassword(
    @Param('id') userId: string,
    @Body('newPassword') newPassword: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.resetPassword(userIdAdmin, userId, newPassword);
  }

  @Get('job-posts')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getJobPosts(
    @Query('status') status: 'Active' | 'Draft' | 'Closed',
    @Query('pendingReview') pendingReview: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    const filters: { status?: 'Active' | 'Draft' | 'Closed'; pendingReview?: boolean } = {};
    if (status) {
      filters.status = status;
    }
    if (pendingReview) {
      filters.pendingReview = pendingReview === 'true';
    }

    return this.adminService.getJobPosts(userIdAdmin, filters);
  }

  @Put('job-posts/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async updateJobPost(
    @Param('id') jobPostId: string,
    @Body() body: { title?: string; description?: string; location?: string; salary?: number; status?: 'Active' | 'Draft' | 'Closed' },
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.updateJobPost(userIdAdmin, jobPostId, body);
  }

  @Delete('job-posts/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async deleteJobPost(
    @Param('id') jobPostId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.deleteJobPost(userIdAdmin, jobPostId);
  }

  @Post('job-posts/:id/approve')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async approveJobPost(
    @Param('id') jobPostId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.approveJobPost(userIdAdmin, jobPostId);
  }

  @Post('job-posts/:id/flag')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async flagJobPost(
    @Param('id') jobPostId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.flagJobPost(userIdAdmin, jobPostId);
  }

  @Get('reviews')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getReviews(
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.getReviews(userIdAdmin);
  }

  @Delete('reviews/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async deleteReview(
    @Param('id') reviewId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.deleteReview(userIdAdmin, reviewId);
  }

  @Get('analytics')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getAnalytics(
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.getAnalytics(userIdAdmin);
  }

  @Post('settings/application-limit')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async setGlobalApplicationLimit(
    @Body('limit') limit: number,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    return this.settingsService.setGlobalApplicationLimit(limit);
  }

  @Get('settings/application-limit')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getGlobalApplicationLimit(
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    return this.settingsService.getGlobalApplicationLimit();
  }

  @Post('job-posts/:id/set-application-limit')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async setApplicationLimit(
    @Param('id') jobPostId: string,
    @Body('limit') limit: number,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.setApplicationLimit(userIdAdmin, jobPostId, limit);
  }

  @Post('blocked-countries')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async addBlockedCountry(
    @Body('countryCode') countryCode: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;

    return this.adminService.addBlockedCountry(adminId, countryCode);
  }

  @Delete('blocked-countries/:countryCode')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async removeBlockedCountry(
    @Param('countryCode') countryCode: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;

    return this.adminService.removeBlockedCountry(adminId, countryCode);
  }

  @Get('blocked-countries')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getBlockedCountries(
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;

    return this.adminService.getBlockedCountries(adminId);
  }

  @Get('analytics/registrations')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getRegistrationStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('interval') interval: 'day' | 'week' | 'month',
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    return this.adminService.getRegistrationStats(adminId, start, end, interval);
  }

  @Get('analytics/geographic-distribution')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getGeographicDistribution(
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;

    return this.adminService.getGeographicDistribution(adminId);
  }

  @Post('profile/:id/verify-identity')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async verifyIdentity(
    @Param('id') userId: string,
    @Body('verify') verify: boolean,
    @Headers('authorization') authHeader: string,
  ) {
    return this.adminService.verifyIdentity(userId, verify, authHeader);
  }
}