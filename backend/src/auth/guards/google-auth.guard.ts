import { Injectable, ExecutionContext, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor() {
    super({
      state: true, // Включаем state
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const role = request.query.role;
    console.log('GoogleAuthGuard - Role from Query:', role);
    if (!role || !['employer', 'jobseeker'].includes(role)) {
      throw new BadRequestException('Invalid or missing role');
    }

    // Передаём роль через state
    request.query.state = JSON.stringify({ role });
    console.log('GoogleAuthGuard - State:', request.query.state);

    return super.canActivate(context) as Promise<boolean>;
  }

  getRequest(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    return request;
  }
}