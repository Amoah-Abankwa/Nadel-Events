import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/app.exception';
import { randomToken, sha256 } from '../../common/utils/codes';
import { OutboxService } from '../notifications/outbox.service';
import type { User } from '../../generated/prisma/client';
import type { LoginDto, RegisterDto } from './auth.dto';

const HASH_OPTS = { type: argon2.argon2id } as const;

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export type PublicUser = Pick<User, 'id' | 'email' | 'name' | 'phone' | 'role'>;

const toPublic = (u: User): PublicUser => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role });

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private dummyHash?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly outbox: OutboxService,
  ) {}

  async register(dto: RegisterDto, meta: SessionMeta): Promise<IssuedSession> {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) {
      throw new AppException(409, 'EMAIL_IN_USE', 'An account with this email already exists. Sign in instead.');
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        passwordHash: await argon2.hash(dto.password, HASH_OPTS),
      },
    });
    return this.issue(user, meta);
  }

  async login(dto: LoginDto, meta: SessionMeta): Promise<IssuedSession> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Always run a hash verification so response time doesn't reveal whether the email exists.
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const ok = await argon2.verify(hash, dto.password).catch(() => false);
    if (!user || !ok || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
    }
    return this.issue(user, meta);
  }

  /** Rotates the refresh token. Reuse of a revoked token revokes every session for that user. */
  async refresh(rawToken: string | undefined, meta: SessionMeta): Promise<IssuedSession> {
    if (!rawToken) throw this.sessionExpired();
    const session = await this.prisma.session.findUnique({ where: { tokenHash: sha256(rawToken) }, include: { user: true } });
    if (!session) throw this.sessionExpired();
    if (session.revokedAt) {
      this.logger.warn(`Refresh token reuse detected for user ${session.userId}; revoking all sessions`);
      await this.prisma.session.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      throw this.sessionExpired();
    }
    if (session.expiresAt < new Date() || session.user.status !== 'ACTIVE') throw this.sessionExpired();
    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return this.issue(session.user, meta);
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    await this.prisma.session.updateMany({ where: { tokenHash: sha256(rawToken), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  /** Always resolves the same way so the endpoint can't be used to discover accounts. */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const token = randomToken();
    const reset = await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const url = `${this.config.get('WEB_URL', { infer: true })}/reset-password?token=${encodeURIComponent(token)}`;
    await this.outbox.enqueue(this.prisma, [
      { channel: 'EMAIL', type: 'PASSWORD_RESET', recipient: user.email, idempotencyKey: `pwreset:${reset.id}`, payload: { name: user.name, url, storeName: this.config.get('STORE_NAME', { infer: true }) } },
    ]);
  }

  async resetPassword(token: string, password: string) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppException(400, 'RESET_TOKEN_INVALID', 'This reset link is invalid or has expired. Request a new one.');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await argon2.hash(password, HASH_OPTS) } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }

  /** Keeps the current session (identified by its refresh token) and signs out everywhere else. */
  async changePassword(userId: string, current: string, next: string, currentRefresh?: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await argon2.verify(user.passwordHash, current).catch(() => false))) {
      throw new AppException(400, 'WRONG_PASSWORD', 'Your current password is incorrect.', [{ field: 'currentPassword', issue: 'Incorrect password' }]);
    }
    const keep = currentRefresh ? sha256(currentRefresh) : undefined;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(next, HASH_OPTS) } }),
      this.prisma.session.updateMany({ where: { userId, revokedAt: null, ...(keep ? { tokenHash: { not: keep } } : {}) }, data: { revokedAt: new Date() } }),
    ]);
  }

  /**
   * Deletes the account by anonymising it. Order and payment records are kept (with the
   * personal fields scrubbed) because tax and accounting rules require sales records.
   */
  async deleteAccount(userId: string, password: string, removePrivateFiles: (paths: string[]) => Promise<void>) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await argon2.verify(user.passwordHash, password).catch(() => false))) {
      throw new AppException(400, 'WRONG_PASSWORD', 'Your password is incorrect.', [{ field: 'password', issue: 'Incorrect password' }]);
    }
    if (user.role !== 'CUSTOMER') throw new AppException(409, 'STAFF_ACCOUNT', 'Staff accounts must have their role removed by the owner before deletion.');
    const openOrders = await this.prisma.order.count({ where: { userId, status: { in: ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERY_EXCEPTION', 'REFUND_PENDING'] } } });
    const openBookings = await this.prisma.serviceRequest.count({ where: { userId, status: { in: ['ACCEPTED', 'CONFIRMED'] } } });
    if (openOrders || openBookings) {
      throw new AppException(409, 'OPEN_ORDERS', 'You have orders or bookings in progress. You can delete your account once they are finished.');
    }
    const requests = await this.prisma.serviceRequest.findMany({ where: { userId }, select: { referenceImages: true } });
    const anon = `deleted-${userId}@deleted.invalid`;
    await this.prisma.$transaction([
      this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.address.deleteMany({ where: { userId } }),
      this.prisma.wishlistItem.deleteMany({ where: { userId } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
      this.prisma.review.deleteMany({ where: { userId } }),
      this.prisma.serviceRequest.updateMany({ where: { userId }, data: { contactPhone: '', location: null, notes: '[deleted]', referenceImages: [], staffNotes: null } }),
      this.prisma.order.updateMany({ where: { userId }, data: { contactName: 'Deleted customer', contactEmail: anon, contactPhone: '', shippingAddress: undefined, notes: null } }),
      this.prisma.$executeRaw`UPDATE "Order" SET "shippingAddress" = NULL WHERE "userId" = ${userId}`,
      this.prisma.user.update({ where: { id: userId }, data: { email: anon, name: 'Deleted customer', phone: null, status: 'SUSPENDED', passwordHash: await argon2.hash(randomToken(), HASH_OPTS) } }),
    ]);
    await removePrivateFiles(requests.flatMap((r) => r.referenceImages)).catch((e) => this.logger.warn(`Could not remove request photos for ${userId}: ${e}`));
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return toPublic(user);
  }

  private async issue(user: User, meta: SessionMeta): Promise<IssuedSession> {
    const refreshToken = randomToken();
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + days * 86_400_000),
        userAgent: meta.userAgent?.slice(0, 255),
        ip: meta.ip,
      },
    });
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { accessToken, refreshToken, user: toPublic(user) };
  }

  private async getDummyHash() {
    this.dummyHash ??= await argon2.hash(randomToken(), HASH_OPTS);
    return this.dummyHash;
  }

  private sessionExpired() {
    return new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Your session has expired. Sign in again.' });
  }
}

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}
