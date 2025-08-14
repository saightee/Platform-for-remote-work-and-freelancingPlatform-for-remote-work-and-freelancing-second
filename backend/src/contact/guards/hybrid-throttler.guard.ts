import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class HybridThrottlerGuard extends ThrottlerGuard {
  // Гость: 3/60; залогинен: 10/60
  protected async getLimit(context: ExecutionContext): Promise<number> {
    const req = this.getRequestFromContext(context);
    return req?.user?.userId ? 10 : 3;
  }

  protected async getTTL(_context: ExecutionContext): Promise<number> {
    return 60;
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (req?.user?.userId) return `user:${req.user.userId}`;
    const xf = (req.headers?.['x-forwarded-for'] as string) || '';
    const ip = req.ip || xf.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  private getRequestFromContext(ctx: ExecutionContext): any {
    const http = ctx.switchToHttp();
    return http.getRequest();
  }
}
