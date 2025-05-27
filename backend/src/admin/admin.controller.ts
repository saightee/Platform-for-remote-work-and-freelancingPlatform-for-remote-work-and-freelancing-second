import { Controller, Get, Post, Put, Delete, Param, Query, Body, Headers, UnauthorizedException, UseGuards, BadRequestException, Res } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SettingsService } from '../settings/settings.service';
import { Response } from 'express';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service';

@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private settingsService: SettingsService,
    private jwtService: JwtService,
    private antiFraudService: AntiFraudService, // Инжектируем
  ) {}

  @Get('users/export-csv')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async exportUsersToCsv(
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;

    const csvData = await this.adminService.exportUsersToCsv(adminId);

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="users.csv"',
    });

    res.send(csvData);
  }

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

  @Get('users/:id/risk-score')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getUserRiskScore(
    @Param('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;
    await this.adminService.checkAdminRole(adminId);
    return this.antiFraudService.getRiskScore(userId);
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

  @Post('users/:id/block')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async blockUser(
    @Param('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.blockUser(userIdAdmin, userId);
  }

  @Post('users/:id/unblock')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async unblockUser(
    @Param('id') userId: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userIdAdmin = payload.sub;

    return this.adminService.unblockUser(userIdAdmin, userId);
  }

  @Get('leaderboards/top-jobseekers-by-views')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getTopJobseekersByViews(
    @Query('limit') limit: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;

    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('Limit must be a positive integer');
    }

    return this.adminService.getTopJobseekersByViews(adminId, parsedLimit);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('analytics/growth-trends')
  async getGrowthTrends(
    @Query('period') period: '7d' | '30d' = '7d',
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;
    return this.adminService.getGrowthTrends(adminId, period);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('analytics/recent-registrations')
  async getRecentRegistrations(
    @Query('limit') limit: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;
    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    return this.adminService.getRecentRegistrations(adminId, parsedLimit);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('job-posts/applications')
  async getJobPostsWithApplications(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;
    return this.adminService.getJobPostsWithApplications(adminId);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('analytics/online-users')
  async getOnlineUsers(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const adminId = payload.sub;
    return this.adminService.getOnlineUsers(adminId);
  }
}