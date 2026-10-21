import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '../../generated/prisma/client';
import { ROLES } from '../decorators/roles.decorator';

/** ADMIN implicitly passes every role check. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest<Request>().user;
    if (user && (user.role === 'ADMIN' || roles.includes(user.role))) return true;
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have permission for this action.' });
  }
}
