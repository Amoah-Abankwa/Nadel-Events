import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import type { Env } from '../../config/env';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defence in depth (cookies are also SameSite=Lax).
 * Browsers always send Origin on cross-site state-changing requests; if present it must be allowlisted.
 * Server-to-server calls (payment callbacks) send no Origin and are authenticated separately.
 */
@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  private readonly allowed: Set<string>;

  constructor(config: ConfigService<Env, true>) {
    this.allowed = new Set(config.get('CORS_ORIGINS', { infer: true }));
  }

  use(req: Request, _res: Response, next: NextFunction) {
    const origin = req.header('origin');
    if (UNSAFE.has(req.method) && origin && !this.allowed.has(origin)) {
      throw new ForbiddenException({ code: 'ORIGIN_NOT_ALLOWED', message: 'Request origin is not allowed.' });
    }
    next();
  }
}
