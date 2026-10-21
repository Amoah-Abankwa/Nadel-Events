import { Body, Controller, Get, HttpCode, Injectable, Module, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { randomToken } from '../../common/utils/codes';
import { OutboxService } from '../notifications/outbox.service';

class SubscribeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)) @IsEmail({}, { message: 'Enter a valid email address' }) @MaxLength(254)
  email: string;

  /** Marketing email needs explicit consent (SRS 10.3); the box must be ticked. */
  @Equals(true, { message: 'Tick the box to agree to receive our emails' })
  consent: boolean;

  @IsOptional() @IsIn(['home.sidebar', 'footer', 'checkout', 'other'])
  source?: string;
}

class UnsubscribeDto {
  @IsString() @Length(20, 100)
  token: string;
}

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Same answer whether or not the address is already on the list (no enumeration). */
  async subscribe(dto: SubscribeDto) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email: dto.email } });
    if (existing && !existing.unsubscribedAt) return { ok: true };
    const sub = existing
      ? await this.prisma.newsletterSubscriber.update({ where: { id: existing.id }, data: { unsubscribedAt: null, consentAt: new Date(), source: dto.source ?? 'other', unsubscribeToken: randomToken(24) } })
      : await this.prisma.newsletterSubscriber.create({ data: { email: dto.email, consentAt: new Date(), source: dto.source ?? 'other', unsubscribeToken: randomToken(24) } });
    const web = this.config.get('WEB_URL', { infer: true });
    await this.outbox.enqueue(this.prisma, [{
      channel: 'EMAIL',
      type: 'NEWSLETTER_WELCOME',
      recipient: sub.email,
      idempotencyKey: `newsletter:${sub.id}:${sub.consentAt.getTime()}`,
      payload: { storeName: this.config.get('STORE_NAME', { infer: true }), shopUrl: web, unsubscribeUrl: `${web}/newsletter/unsubscribe?token=${sub.unsubscribeToken}` },
    }]);
    return { ok: true };
  }

  async unsubscribe(token: string) {
    await this.prisma.newsletterSubscriber.updateMany({ where: { unsubscribeToken: token, unsubscribedAt: null }, data: { unsubscribedAt: new Date() } });
    return { ok: true };
  }

  async list(includeUnsubscribed: boolean) {
    const where = includeUnsubscribed ? {} : { unsubscribedAt: null };
    const [items, active, total] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: 'desc' }, take: 5000, select: { id: true, email: true, source: true, consentAt: true, unsubscribedAt: true, createdAt: true } }),
      this.prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
      this.prisma.newsletterSubscriber.count(),
    ]);
    return { items, active, total };
  }
}

@Controller()
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Public() @Throttle({ default: { limit: 5, ttl: 3_600_000 } }) @HttpCode(200) @Post('newsletter')
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletter.subscribe(dto);
  }

  @Public() @Throttle({ default: { limit: 20, ttl: 3_600_000 } }) @HttpCode(200) @Post('newsletter/unsubscribe')
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.newsletter.unsubscribe(dto.token);
  }

  /** Export for your email tool. Only send marketing to "active" subscribers. */
  @Roles('MARKETING') @Get('admin/newsletter')
  list(@Query('all') all?: string) {
    return this.newsletter.list(all === 'true');
  }
}

@Module({ controllers: [NewsletterController], providers: [NewsletterService] })
export class NewsletterModule {}
