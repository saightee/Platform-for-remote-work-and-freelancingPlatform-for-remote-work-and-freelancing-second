import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Headers,
  UseGuards,
  UnauthorizedException,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

import { AffiliateProgramService } from './affiliate-program.service';
import { CreateAffiliateLinkDto } from './dto/create-affiliate-link.dto';
import { UpdateTrackingSettingsDto } from './dto/update-tracking-settings.dto';
import { AffiliateLeadStatus } from './entities/affiliate-registration.entity';

@Controller('affiliate')
export class AffiliateProgramController {
  constructor(
    private affiliateProgramService: AffiliateProgramService,
    private jwtService: JwtService,
  ) {}

  private getUserIdFromAuthHeader(authHeader: string): { userId: string; role: string } {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload: any = this.jwtService.verify(token);
    return { userId: payload.sub, role: payload.role };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMyAffiliateDashboard(@Headers('authorization') authHeader: string) {
    const { userId, role } = this.getUserIdFromAuthHeader(authHeader);
    if (role !== 'affiliate') {
      throw new UnauthorizedException('Only affiliates can access this resource');
    }
    return this.affiliateProgramService.getAffiliateDashboard(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('settings/tracking')
  async updateTrackingSettings(
    @Headers('authorization') authHeader: string,
    @Body() dto: UpdateTrackingSettingsDto,
  ) {
    const { userId, role } = this.getUserIdFromAuthHeader(authHeader);
    if (role !== 'affiliate') {
      throw new UnauthorizedException('Only affiliates can access this resource');
    }
    return this.affiliateProgramService.updateTrackingSettings(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('offers')
  async listOffers(@Headers('authorization') authHeader: string) {
    const { userId, role } = this.getUserIdFromAuthHeader(authHeader);
    if (role !== 'affiliate') {
      throw new UnauthorizedException('Only affiliates can access this resource');
    }
    return this.affiliateProgramService.listOffersForAffiliate(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('links')
  async createLink(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateAffiliateLinkDto,
  ) {
    const { userId, role } = this.getUserIdFromAuthHeader(authHeader);
    if (role !== 'affiliate') {
      throw new UnauthorizedException('Only affiliates can access this resource');
    }
    return this.affiliateProgramService.createLinkForAffiliate(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('links')
  async listLinks(@Headers('authorization') authHeader: string) {
    const { userId, role } = this.getUserIdFromAuthHeader(authHeader);
    if (role !== 'affiliate') {
      throw new UnauthorizedException('Only affiliates can access this resource');
    }
    return this.affiliateProgramService.listLinksForAffiliate(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('registrations')
  async listMyRegistrations(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: 'jobseeker' | 'employer',
    @Query('status') status?: AffiliateLeadStatus,
  ) {
    const { userId, role: userRole } = this.getUserIdFromAuthHeader(authHeader);
    if (userRole !== 'affiliate') {
      throw new UnauthorizedException('Only affiliates can access this resource');
    }

    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 20 : 20;

    return this.affiliateProgramService.listRegistrationsForAffiliate(userId, {
      page: pageNum,
      limit: limitNum,
      role,
      status,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('stats')
  async getMyStats(
    @Headers('authorization') authHeader: string,
    @Query('range') range: 'today' | 'yesterday' | '7d' | '30d' | 'custom' = '7d',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { userId, role } = this.getUserIdFromAuthHeader(authHeader);
    if (role !== 'affiliate') {
      throw new UnauthorizedException('Only affiliates can access this resource');
    }

    const opts: any = { range };

    if (range === 'custom') {
      if (!from || !to) {
        throw new BadRequestException('from and to are required for custom range');
      }
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid from/to date');
      }
      opts.from = fromDate;
      opts.to = toDate;
    }

    return this.affiliateProgramService.getStatsForAffiliate(userId, opts);
  }
}
