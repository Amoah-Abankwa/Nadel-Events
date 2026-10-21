import type { Role } from '../generated/prisma/client';

export interface AuthUser {
  id: string;
  role: Role;
}

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
    user?: AuthUser;
    rawBody?: Buffer;
  }
}
