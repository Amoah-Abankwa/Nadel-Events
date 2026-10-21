import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC } from '../decorators/public.decorator';
import { ACCESS_COOKIE } from '../../modules/auth/auth.cookies';
import type { AuthUser } from '../types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    const req = context.switchToHttp().getRequest<Request>();
    const token = (req.cookies?.[ACCESS_COOKIE] as string | undefined) ?? bearer(req);

    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string; role: AuthUser['role'] }>(token);
        req.user = { id: payload.sub, role: payload.role };
      } catch {
        if (!isPublic) {
          throw new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Your session has expired. Sign in again.' });
        }
      }
    }

    if (isPublic) return true;
    if (!req.user) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Sign in to continue.' });
    return true;
  }
}

function bearer(req: Request): string | undefined {
  const h = req.header('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : undefined;
}
