import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SessionService } from './session.service';

export interface AuthRequest {
  cookies: Record<string, string | undefined>;
  userId?: string;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies['session'];

    if (typeof token !== 'string') {
      throw new UnauthorizedException();
    }

    const session = await this.sessionService.validate(token);

    if (session === null) {
      throw new UnauthorizedException();
    }

    request.userId = session.userId;
    return true;
  }
}
