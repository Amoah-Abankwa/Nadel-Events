import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import type { Env } from '../../config/env';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/app.exception';
import { sha256 } from '../../common/utils/codes';
import { AuditService } from '../audit/audit.service';
import { CatalogueService } from '../catalogue/catalogue.service';
import { OutboxService } from '../notifications/outbox.service';
import { displayName } from '../reviews/reviews.service';
import type { BannerDto, CampaignDto, GiveawayDto } from './marketing.dto';

const MAX_ENTRIES_PER_DEVICE = 5;

/** Live = published and inside its (optional) window. Times are UTC, which is Ghana time. */
const live = (now = new Date()) => ({
  status: 'PUBLISHED' as const,
  AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
});

interface CampaignContent {
  headline: string;
  body?: string;
  heroImage?: string | null;
  productIds?: string[];
  couponCode?: string | null;
}

@Injectable()
export class MarketingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogue: CatalogueService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private readonly logger = new Logger(MarketingService.name);

  /** Retention promised in the giveaway rules: entries are deleted 90 days after the draw. */
  @Interval(6 * 3_600_000)
  async purgeOldEntries() {
    const cutoff = new Date(Date.now() - 90 * 86_400_000);
    const { count } = await this.prisma.giveawayEntry.deleteMany({ where: { giveaway: { winnerDrawnAt: { lt: cutoff } } } }).catch(() => ({ count: 0 }));
    if (count) this.logger.log(`Deleted ${count} giveaway entries past retention`);
  }

  // ---------------- banners ----------------

  activeBanners(placement: string) {
    return this.prisma.banner.findMany({
      where: { placement, ...live() },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: placement === 'home.hero' || placement === 'cakes.hero' ? 5 : placement === 'home.promo' ? 2 : ['home.strip', 'home.feature', 'home.sidebar', 'decor.hero', 'decor.feature'].includes(placement) ? 1 : 3,
      select: { id: true, title: true, desktopImage: true, mobileImage: true, altText: true, destinationUrl: true, isSponsored: true },
    });
  }

  async click(id: string) {
    await this.prisma.banner.updateMany({ where: { id }, data: { clicks: { increment: 1 } } });
  }

  adminBanners() {
    return this.prisma.banner.findMany({ orderBy: [{ placement: 'asc' }, { priority: 'desc' }], include: { campaign: { select: { name: true } } } });
  }

  async saveBanner(id: string | null, dto: BannerDto, actorId: string, requestId?: string) {
    checkWindow(dto.startsAt, dto.endsAt);
    const data = { ...dto, startsAt: dto.startsAt ? new Date(dto.startsAt) : null, endsAt: dto.endsAt ? new Date(dto.endsAt) : null };
    const b = id ? await this.prisma.banner.update({ where: { id }, data }) : await this.prisma.banner.create({ data });
    await this.audit.record({ actorId, requestId, action: id ? 'banner.update' : 'banner.create', resourceType: 'Banner', resourceId: b.id, after: dto });
    return b;
  }

  // ---------------- campaigns ----------------

  async activeCampaigns() {
    const rows = await this.prisma.campaign.findMany({ where: live(), orderBy: { startsAt: 'desc' } });
    return rows.map((c) => ({ slug: c.slug, name: c.name, endsAt: c.endsAt, ...pickContent(c.content) }));
  }

  async campaignPage(slug: string, preview: boolean) {
    const c = await this.prisma.campaign.findFirst({ where: { slug, ...(preview ? {} : live()) } });
    if (!c) throw new NotFoundException({ code: 'CAMPAIGN_NOT_FOUND', message: 'This promotion has ended or doesn’t exist.' });
    const content = pickContent(c.content);
    return { slug: c.slug, name: c.name, startsAt: c.startsAt, endsAt: c.endsAt, ...content, products: await this.catalogue.cardsByIds(content.productIds ?? []) };
  }

  async adminCampaigns() {
    const rows = await this.prisma.campaign.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { banners: true } } } });
    return rows.map((c) => ({ ...c, content: pickContent(c.content) }));
  }

  async saveCampaign(id: string | null, dto: CampaignDto, actorId: string, requestId?: string) {
    checkWindow(dto.startsAt, dto.endsAt);
    const content: CampaignContent = { headline: dto.headline, body: dto.body, heroImage: dto.heroImage ?? null, productIds: dto.productIds ?? [], couponCode: dto.couponCode || null };
    const data = {
      name: dto.name,
      slug: dto.slug,
      status: dto.status,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      content: content as unknown as Prisma.InputJsonValue,
    };
    const c = id ? await this.prisma.campaign.update({ where: { id }, data }) : await this.prisma.campaign.create({ data });
    await this.audit.record({ actorId, requestId, action: id ? 'campaign.update' : 'campaign.create', resourceType: 'Campaign', resourceId: c.id, after: dto });
    return c;
  }

  // ---------------- giveaways ----------------

  async publicGiveaways() {
    const recent = new Date(Date.now() - 30 * 86_400_000);
    const rows = await this.prisma.giveaway.findMany({ where: { status: 'PUBLISHED', closesAt: { gt: recent } }, orderBy: { closesAt: 'asc' } });
    return rows.map((g) => this.publicGiveaway(g));
  }

  async giveaway(slug: string, userId?: string) {
    const g = await this.prisma.giveaway.findFirst({ where: { slug, status: 'PUBLISHED' } });
    if (!g) throw new NotFoundException({ code: 'GIVEAWAY_NOT_FOUND', message: 'This giveaway doesn’t exist.' });
    const myEntries = userId ? await this.prisma.giveawayEntry.count({ where: { giveawayId: g.id, userId } }) : 0;
    return { ...this.publicGiveaway(g), rules: g.rules, entryLimit: g.entryLimit, myEntries, isWinner: Boolean(userId && g.winnerUserId === userId) };
  }

  async enter(slug: string, userId: string, ip: string | undefined) {
    return this.prisma.$transaction(async (tx) => {
      const g = await tx.giveaway.findFirst({ where: { slug, status: 'PUBLISHED' } });
      if (!g) throw new NotFoundException({ code: 'GIVEAWAY_NOT_FOUND', message: 'This giveaway doesn’t exist.' });
      await tx.$queryRaw`SELECT id FROM "Giveaway" WHERE id = ${g.id} FOR UPDATE`;
      const now = new Date();
      if (now < g.opensAt) throw new AppException(409, 'GIVEAWAY_NOT_OPEN', 'This giveaway hasn’t opened yet.');
      if (now >= g.closesAt) throw new AppException(409, 'GIVEAWAY_CLOSED', 'This giveaway has closed.');
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.role !== 'CUSTOMER') throw new AppException(403, 'STAFF_NOT_ELIGIBLE', 'Staff can’t enter giveaways.');
      const mine = await tx.giveawayEntry.count({ where: { giveawayId: g.id, userId } });
      if (mine >= g.entryLimit) throw new AppException(409, 'ENTRY_LIMIT', g.entryLimit === 1 ? 'You’ve already entered.' : `You’ve used all ${g.entryLimit} entries.`);
      // Light anti-abuse: cap entries per network/device fingerprint (hashed, never stored raw).
      const ipHash = ip ? sha256(`${g.id}:${ip}:${this.config.get('JWT_ACCESS_SECRET', { infer: true })}`) : null;
      if (ipHash && (await tx.giveawayEntry.count({ where: { giveawayId: g.id, ipHash } })) >= MAX_ENTRIES_PER_DEVICE) {
        throw new AppException(429, 'TOO_MANY_ENTRIES', 'Too many entries from this connection.');
      }
      await tx.giveawayEntry.create({ data: { giveawayId: g.id, userId, ipHash } });
      return { myEntries: mine + 1, entryLimit: g.entryLimit };
    });
  }

  async adminGiveaways() {
    const rows = await this.prisma.giveaway.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { entries: true } } } });
    const entrants = await this.prisma.$queryRaw<{ giveawayId: string; n: bigint }[]>`
      SELECT "giveawayId", count(DISTINCT "userId")::bigint AS n FROM "GiveawayEntry" GROUP BY "giveawayId"`;
    const byId = new Map(entrants.map((e) => [e.giveawayId, Number(e.n)]));
    const winners = await this.prisma.user.findMany({ where: { id: { in: rows.map((g) => g.winnerUserId).filter((x): x is string => Boolean(x)) } }, select: { id: true, name: true, email: true, phone: true } });
    return rows.map(({ _count, ...g }) => ({ ...g, entries: _count.entries, entrants: byId.get(g.id) ?? 0, winner: winners.find((w) => w.id === g.winnerUserId) ?? null }));
  }

  async saveGiveaway(id: string | null, dto: GiveawayDto, actorId: string, requestId?: string) {
    checkWindow(dto.opensAt, dto.closesAt, true);
    if (id) {
      const cur = await this.prisma.giveaway.findUniqueOrThrow({ where: { id } });
      if (cur.winnerDrawnAt && (dto.closesAt !== cur.closesAt.toISOString() || dto.entryLimit !== cur.entryLimit)) {
        throw new AppException(409, 'ALREADY_DRAWN', 'A winner has been drawn; the dates and entry limit can no longer change.');
      }
    }
    const data = { ...dto, opensAt: new Date(dto.opensAt), closesAt: new Date(dto.closesAt) };
    const g = id ? await this.prisma.giveaway.update({ where: { id }, data }) : await this.prisma.giveaway.create({ data });
    await this.audit.record({ actorId, requestId, action: id ? 'giveaway.update' : 'giveaway.create', resourceType: 'Giveaway', resourceId: g.id, after: dto });
    return g;
  }

  /**
   * Draws uniformly at random over entries (each entry is one ticket) using a CSPRNG, skipping
   * previously excluded winners. Audited with the entry count so the draw can be evidenced.
   */
  async draw(id: string, actorId: string, requestId?: string, redrawReason?: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Giveaway" WHERE id = ${id} FOR UPDATE`;
      const g = await tx.giveaway.findUniqueOrThrow({ where: { id } });
      if (new Date() < g.closesAt) throw new AppException(409, 'NOT_CLOSED', 'You can draw a winner once the giveaway has closed.');
      if (g.winnerUserId && !redrawReason) throw new AppException(409, 'ALREADY_DRAWN', 'A winner has already been drawn.');
      const excluded = g.winnerUserId ? [...g.excludedUserIds, g.winnerUserId] : g.excludedUserIds;
      const pool = await tx.giveawayEntry.findMany({ where: { giveawayId: id, userId: { notIn: excluded }, user: { status: 'ACTIVE' } }, select: { id: true, userId: true }, orderBy: { createdAt: 'asc' } });
      if (!pool.length) throw new AppException(409, 'NO_ENTRIES', 'There are no eligible entries to draw from.');
      const pick = pool[randomInt(pool.length)];
      const winner = await tx.user.findUniqueOrThrow({ where: { id: pick.userId } });
      const updated = await tx.giveaway.update({
        where: { id },
        data: { winnerUserId: winner.id, winnerDisplayName: displayName(winner.name), winnerDrawnAt: new Date(), excludedUserIds: excluded },
      });
      await this.audit.record({ actorId, requestId, action: redrawReason ? 'giveaway.redraw' : 'giveaway.draw', resourceType: 'Giveaway', resourceId: id, after: { entryId: pick.id, poolSize: pool.length, reason: redrawReason } }, tx);
      await this.outbox.enqueue(tx, [{
        channel: 'EMAIL',
        type: 'GIVEAWAY_WON',
        recipient: winner.email,
        idempotencyKey: `giveaway:${id}:winner:${winner.id}`,
        payload: {
          storeName: this.config.get('STORE_NAME', { infer: true }),
          name: winner.name,
          title: g.title,
          prize: g.prize,
          url: `${this.config.get('WEB_URL', { infer: true })}/giveaways/${g.slug}`,
        },
      }]);
      return { winner: { name: winner.name, email: winner.email, phone: winner.phone, displayName: updated.winnerDisplayName }, poolSize: pool.length };
    });
  }

  private publicGiveaway(g: { slug: string; title: string; prize: string; description: string; imageUrl: string | null; opensAt: Date; closesAt: Date; winnerDisplayName: string | null; winnerDrawnAt: Date | null }) {
    const now = new Date();
    return {
      slug: g.slug,
      title: g.title,
      prize: g.prize,
      description: g.description,
      imageUrl: g.imageUrl,
      opensAt: g.opensAt,
      closesAt: g.closesAt,
      state: now < g.opensAt ? 'UPCOMING' : now < g.closesAt ? 'OPEN' : 'CLOSED',
      winner: g.winnerDrawnAt ? g.winnerDisplayName : null,
    };
  }
}

function checkWindow(start?: string | null, end?: string | null, required = false) {
  if (required && (!start || !end)) throw new AppException(400, 'VALIDATION_ERROR', 'Set both the opening and closing times.');
  if (start && end && new Date(end) <= new Date(start)) {
    throw new AppException(400, 'VALIDATION_ERROR', 'The end must be after the start.', [{ field: 'endsAt', issue: 'Must be after the start' }]);
  }
}

function pickContent(raw: unknown): CampaignContent {
  const c = (raw ?? {}) as Partial<CampaignContent>;
  return { headline: c.headline ?? '', body: c.body ?? '', heroImage: c.heroImage ?? null, productIds: Array.isArray(c.productIds) ? c.productIds : [], couponCode: c.couponCode ?? null };
}
