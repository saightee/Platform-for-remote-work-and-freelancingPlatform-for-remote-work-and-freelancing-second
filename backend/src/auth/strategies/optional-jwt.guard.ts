import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context); 
  }
  handleRequest(err: any, user: any, info: any) {

    if (err || info) return undefined;
    return user; 
  }
}