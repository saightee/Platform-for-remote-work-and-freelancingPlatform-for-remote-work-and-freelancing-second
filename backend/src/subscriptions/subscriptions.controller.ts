import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly jwtService: JwtService,
  ) {}

  // --------- Планы (предположим, что это будет для админки) ---------

  @UseGuards(AuthGuard('jwt'))
  @Post('plans')
  async createPlan(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      code: string;
      name: string;
      description?: string;
      price_per_month?: number;
      max_job_posts?: number;
      max_active_job_posts?: number;
      max_applications_per_job?: number;
      max_applications_total?: number;
    },
  ) {
    const payload = this.getPayload(authHeader);
    if (!['admin', 'moderator'].includes(payload.role)) {
      throw new UnauthorizedException('Only admins or moderators can create plans');
    }

    return this.subscriptionsService.createPlan(body);
  }

  @Get('plans')
  async listPlans() {
    // Планы можно показать всем, здесь без авторизации
    return this.subscriptionsService.listPlans();
  }

  // --------- Подписка текущего работодателя ---------

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMySubscription(@Headers('authorization') authHeader: string) {
    const payload = this.getPayload(authHeader);
    if (payload.role !== 'employer') {
      throw new UnauthorizedException('Only employers have subscriptions');
    }

    return this.subscriptionsService.getEmployerCurrentPlan(payload.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/change-plan')
  async changeMyPlan(
    @Headers('authorization') authHeader: string,
    @Body() body: { plan_id: string | null },
  ) {
    const payload = this.getPayload(authHeader);
    if (payload.role !== 'employer') {
      throw new UnauthorizedException('Only employers can change subscription');
    }

    return this.subscriptionsService.setEmployerPlan(payload.sub, body.plan_id);
  }

  // --------- helper ---------

  private getPayload(authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    return this.jwtService.verify(token);
  }
}
