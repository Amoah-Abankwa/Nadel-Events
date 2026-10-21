import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SAFE_ID = /^[A-Za-z0-9_\-]{8,64}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header('x-request-id');
    req.requestId = incoming && SAFE_ID.test(incoming) ? incoming : `req_${randomUUID().replace(/-/g, '')}`;
    res.setHeader('x-request-id', req.requestId);
    next();
  }
}
