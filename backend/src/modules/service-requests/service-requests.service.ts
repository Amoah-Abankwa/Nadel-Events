import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import type { Prisma, ServiceRequestStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Tx } from '../../prisma/transaction';
import { AppException } from '../../common/app.exception';
import { orderNumber } from '../../common/utils/codes';
import { dec, money } from '../../common/utils/money';
import { PageQuery, paginate } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
import { ServiceNotifier } from '../notifications/service-notifier';
import { PaymentProcessor } from '../payments/payment-processor.service';
import { PaymentsService, type PaymentStart } from '../payments/payments.service';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../storage/storage.service';
import type { AdminRequestQuery, CreateServiceRequestDto, QuoteDto, StaffStatusDto } from './service-requests.dto';

const full = { service: true, user: { select: { name: true, email: true, phone: true } }, orders: { orderBy: { placedAt: 'desc' as const } } } satisfies Prisma.ServiceRequestInclude;
type Full = Prisma.ServiceRequestGetPayload<{ include: typeof full }>;

const QUOTABLE: ServiceRequestStatus[] = ['SUBMITTED', 'QUOTED', 'DECLINED'];
const CUSTOMER_CANCELLABLE: ServiceRequestStatus[] = ['SUBMITTED', 'QUOTED', 'DECLINED', 'ACCEPTED'];
const STAFF_ALLOWED: Record<StaffStatusDto['status'], ServiceRequestStatus[]> = {
  REJECTED: ['SUBMITTED', 'QUOTED', 'DECLINED'],
  COMPLETED: ['CONFIRMED'],
  CANCELLED: ['SUBMITTED', 'QUOTED', 'DECLINED', 'ACCEPTED', 'CONFIRMED'],
};

const todayUtc = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};
const dateOnly = (s: string) => new Date(`${s}T00:00:00Z`);
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

function reference(now = new Date()) {
  return orderNumber(now).replace(/^CK-/, 'SR-').slice(0, 14); // SR-YYMMDD-XXXX
}

/**
 * Custom cake / event requests (SRS FR-019, FR-020).
 * SUBMITTED → QUOTED → ACCEPTED → (deposit paid) CONFIRMED → COMPLETED,
 * with DECLINED (customer, can be re-quoted), REJECTED (shop) and CANCELLED.
 * The deposit is an ordinary order, so it uses the verified payment pipeline.
 */
@Injectable()
export class ServiceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly settings: SettingsService,
    private readonly storage: StorageService,
    private readonly notifier: ServiceNotifier,
    private readonly payments: PaymentsService,
    private readonly processor: PaymentProcessor,
    private readonly audit: AuditService,
  ) {}

  // ---------------- public ----------------

  async services() {
    const { serviceLeadDays } = await this.settings.get();
    const rows = await this.prisma.service.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    return { leadDays: serviceLeadDays, services: rows.map((s) => ({ slug: s.slug, name: s.name, description: s.description, imageUrl: s.imageUrl })) };
  }

  // ---------------- customer ----------------

  async create(userId: string, dto: CreateServiceRequestDto) {
    const service = await this.prisma.service.findFirst({ where: { slug: dto.service, isActive: true } });
    if (!service) throw new AppException(422, 'SERVICE_UNAVAILABLE', 'That service isn’t available. Choose another.');

    const { serviceLeadDays } = await this.settings.get();
    const earliest = new Date(todayUtc().getTime() + serviceLeadDays * 86_400_000);
    if (dateOnly(dto.eventDate) < earliest) {
      throw new AppException(422, 'EVENT_TOO_SOON', `We need at least ${serviceLeadDays} days’ notice. For anything sooner, message us on WhatsApp.`, [{ field: 'eventDate', issue: 'too_soon' }]);
    }
    const images = dto.referenceImages ?? [];
    if (images.some((p) => !this.storage.ownsRequestPhoto(p, userId))) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Upload your photos again.', [{ field: 'referenceImages', issue: 'invalid' }]);
    }
    if (dto.fulfilmentPreference !== 'PICKUP' && !dto.location) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Please review the highlighted fields.', [{ field: 'location', issue: 'Tell us where the event is' }]);
    }

    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const r = await tx.serviceRequest.create({
            data: {
              reference: reference(),
              serviceId: service.id,
              userId,
              eventDate: dateOnly(dto.eventDate),
              guestCount: dto.guestCount,
              budget: dto.budget,
              fulfilmentPreference: dto.fulfilmentPreference,
              location: dto.location,
              notes: dto.notes,
              referenceImages: images,
              contactPhone: dto.contactPhone,
            },
            include: full,
          });
          await this.notifier.submitted(tx, r);
          return { reference: r.reference };
        });
      } catch (e) {
        // Reference collision is very unlikely; retry with a new one.
        if (attempt < 2 && (e as { code?: string }).code === 'P2002') continue;
        throw e;
      }
    }
  }

  async listMine(userId: string, q: PageQuery) {
    const where = { userId };
    const [rows, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({ where, include: full, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.prisma.serviceRequest.count({ where }),
    ]);
    return paginate(await Promise.all(rows.map((r) => this.view(r, false))), total, q);
  }

  async getMine(userId: string, ref: string) {
    return this.view(await this.findMine(userId, ref), true);
  }

  /** Customer accepts the quote. With a deposit, returns where to pay; without, it's booked at once. */
  async accept(userId: string, ref: string): Promise<{ status: ServiceRequestStatus; payment?: PaymentStart; paymentError?: string }> {
    const r = await this.findMine(userId, ref);
    const updated = await this.prisma.$transaction(async (tx) => {
      const cur = await this.lock(tx, r.id);
      if (cur.status !== 'QUOTED') throw new AppException(409, 'NOT_QUOTED', 'There is no open quote to accept.');
      if (cur.quoteValidUntil && cur.quoteValidUntil < todayUtc()) {
        throw new AppException(409, 'QUOTE_EXPIRED', 'This quote has expired. Message us and we’ll send a fresh one.');
      }
      const noDeposit = dec(cur.depositAmount).lte(0);
      const next = await tx.serviceRequest.update({
        where: { id: r.id },
        data: { status: noDeposit ? 'CONFIRMED' : 'ACCEPTED', acceptedAt: new Date() },
        include: full,
      });
      if (noDeposit) await this.notifier.statusToCustomer(tx, next);
      await this.notifier.statusToOwner(tx, next);
      return next;
    });
    if (updated.status === 'CONFIRMED') return { status: updated.status };
    try {
      return { status: updated.status, payment: await this.payDeposit(userId, ref) };
    } catch {
      // Accepted is saved; the customer can pay from the request page once the provider responds.
      return { status: updated.status, paymentError: 'Your acceptance is saved, but the payment page didn’t open. Use “Pay deposit” to try again.' };
    }
  }

  /** Start or resume paying the deposit. A fresh deposit order is created if the last one expired. */
  async payDeposit(userId: string, ref: string): Promise<PaymentStart> {
    const r = await this.findMine(userId, ref);
    if (r.status !== 'ACCEPTED') throw new AppException(409, 'DEPOSIT_NOT_DUE', 'There is no deposit to pay for this request.');

    const open = r.orders.find((o) => o.status === 'PENDING_PAYMENT' && (!o.reservationExpiresAt || o.reservationExpiresAt > new Date()));
    if (open) return this.payments.initiate(open.orderNumber, userId);

    const { paymentWindowMinutes } = await this.settings.get();
    const deposit = money(r.depositAmount ?? 0);
    const order = await this.prisma.order.create({
      data: {
        orderNumber: orderNumber(),
        userId,
        checkoutKey: `deposit:${r.id}:${r.orders.length + 1}`,
        serviceRequestId: r.id,
        fulfilmentType: 'PICKUP',
        currency: this.config.get('CURRENCY', { infer: true }),
        subtotal: deposit,
        discountTotal: '0',
        taxTotal: '0',
        taxLines: [],
        deliveryFee: '0',
        total: deposit,
        contactName: r.user.name,
        contactEmail: r.user.email,
        contactPhone: r.contactPhone,
        notes: `Deposit for ${r.reference}`,
        reservationExpiresAt: new Date(Date.now() + paymentWindowMinutes * 60_000),
        items: {
          create: [{ productName: `Deposit: ${r.service.name} (${r.reference})`, variantName: 'Deposit', sku: `DEP-${r.reference}`, unitPrice: deposit, quantity: 1, lineTotal: deposit, returnWindowDays: 0 }],
        },
        history: { create: { to: 'PENDING_PAYMENT', actorId: userId, note: `Deposit for ${r.reference}` } },
      },
    });
    return this.payments.initiate(order.orderNumber, userId);
  }

  async decline(userId: string, ref: string, reason?: string) {
    const r = await this.findMine(userId, ref);
    return this.prisma.$transaction(async (tx) => {
      const cur = await this.lock(tx, r.id);
      if (cur.status !== 'QUOTED') throw new AppException(409, 'NOT_QUOTED', 'There is no open quote to decline.');
      const next = await tx.serviceRequest.update({ where: { id: r.id }, data: { status: 'DECLINED', closedReason: reason ?? null }, include: full });
      await this.notifier.statusToOwner(tx, next);
      return { status: next.status };
    });
  }

  async cancelMine(userId: string, ref: string, reason?: string) {
    const r = await this.findMine(userId, ref);
    return this.prisma.$transaction(async (tx) => {
      const cur = await this.lock(tx, r.id);
      if (!CUSTOMER_CANCELLABLE.includes(cur.status)) {
        throw new AppException(409, 'NOT_CANCELLABLE', 'This booking is confirmed. Message us to change or cancel it.');
      }
      await this.closePendingDeposits(tx, r.id, userId);
      const next = await tx.serviceRequest.update({ where: { id: r.id }, data: { status: 'CANCELLED', closedReason: reason ?? 'Cancelled by customer' }, include: full });
      await this.notifier.statusToOwner(tx, next);
      return { status: next.status };
    });
  }

  // ---------------- staff ----------------

  async adminList(q: AdminRequestQuery) {
    const where: Prisma.ServiceRequestWhereInput = {
      ...(q.status ? { status: q.status as ServiceRequestStatus } : {}),
      ...(q.q ? { OR: [{ reference: { contains: q.q, mode: 'insensitive' as const } }, { user: { email: { contains: q.q, mode: 'insensitive' as const } } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      // Soonest events first: that's the order staff work in.
      this.prisma.serviceRequest.findMany({ where, include: full, orderBy: [{ eventDate: 'asc' }, { createdAt: 'asc' }], skip: (q.page - 1) * q.limit, take: q.limit }),
      this.prisma.serviceRequest.count({ where }),
    ]);
    return paginate(await Promise.all(rows.map((r) => this.view(r, false, true))), total, q);
  }

  async adminGet(ref: string) {
    const r = await this.prisma.serviceRequest.findUnique({ where: { reference: ref }, include: full });
    if (!r) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found.' });
    return this.view(r, true, true);
  }

  async quote(ref: string, dto: QuoteDto, actorId: string, requestId?: string) {
    if (dec(dto.depositAmount).gt(dec(dto.quoteAmount))) {
      throw new AppException(400, 'VALIDATION_ERROR', 'The deposit can’t be more than the total.', [{ field: 'depositAmount', issue: 'Deposit is more than the total' }]);
    }
    if (dec(dto.quoteAmount).lte(0)) throw new AppException(400, 'VALIDATION_ERROR', 'Enter the full price.', [{ field: 'quoteAmount', issue: 'Must be more than 0' }]);
    if (dateOnly(dto.quoteValidUntil) < todayUtc()) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Choose a date from today onwards.', [{ field: 'quoteValidUntil', issue: 'In the past' }]);
    }
    const r = await this.byRef(ref);
    return this.prisma.$transaction(async (tx) => {
      const cur = await this.lock(tx, r.id);
      if (!QUOTABLE.includes(cur.status)) throw new AppException(409, 'NOT_QUOTABLE', `A request that is ${cur.status.toLowerCase()} can’t be quoted.`);
      const next = await tx.serviceRequest.update({
        where: { id: r.id },
        data: { status: 'QUOTED', quoteAmount: dto.quoteAmount, depositAmount: dto.depositAmount, quoteValidUntil: dateOnly(dto.quoteValidUntil), quoteNote: dto.quoteNote, quotedAt: new Date(), closedReason: null },
        include: full,
      });
      await this.notifier.quoted(tx, next);
      await this.audit.record({ actorId, requestId, action: 'service_request.quote', resourceType: 'ServiceRequest', resourceId: r.id, before: { status: cur.status, quoteAmount: cur.quoteAmount?.toString() }, after: dto }, tx);
      return { status: next.status };
    });
  }

  async staffStatus(ref: string, dto: StaffStatusDto, actorId: string, requestId?: string) {
    const r = await this.byRef(ref);
    return this.prisma.$transaction(async (tx) => {
      const cur = await this.lock(tx, r.id);
      if (!STAFF_ALLOWED[dto.status].includes(cur.status)) {
        throw new AppException(409, 'INVALID_STATUS', `A ${cur.status.toLowerCase()} request can’t be marked ${dto.status.toLowerCase()}.`);
      }
      if (dto.status !== 'COMPLETED' && !dto.reason) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Add a short reason; the customer will see it.', [{ field: 'reason', issue: 'Required' }]);
      }
      if (dto.status === 'CANCELLED') await this.closePendingDeposits(tx, r.id, actorId);
      const next = await tx.serviceRequest.update({ where: { id: r.id }, data: { status: dto.status, closedReason: dto.reason ?? null }, include: full });
      await this.notifier.statusToCustomer(tx, next);
      await this.audit.record({ actorId, requestId, action: 'service_request.status', resourceType: 'ServiceRequest', resourceId: r.id, before: { status: cur.status }, after: dto }, tx);
      return { status: next.status, refundNeeded: cur.status === 'CONFIRMED' && dto.status === 'CANCELLED' };
    });
  }

  async staffNotes(ref: string, staffNotes: string) {
    const r = await this.byRef(ref);
    await this.prisma.serviceRequest.update({ where: { id: r.id }, data: { staffNotes } });
    return { staffNotes };
  }

  // ---------------- helpers ----------------

  private async findMine(userId: string, ref: string) {
    const r = await this.prisma.serviceRequest.findFirst({ where: { reference: ref, userId }, include: full });
    if (!r) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found.' });
    return r;
  }

  private async byRef(ref: string) {
    const r = await this.prisma.serviceRequest.findUnique({ where: { reference: ref } });
    if (!r) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found.' });
    return r;
  }

  private async lock(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM "ServiceRequest" WHERE id = ${id} FOR UPDATE`;
    return tx.serviceRequest.findUniqueOrThrow({ where: { id } });
  }

  /** Stop any unpaid deposit so a late payment can't confirm a cancelled request. */
  private async closePendingDeposits(tx: Tx, requestId: string, actorId: string) {
    const pending = await tx.order.findMany({ where: { serviceRequestId: requestId, status: 'PENDING_PAYMENT' } });
    for (const o of pending) {
      await this.processor.closeUnpaid(tx, o.id, o.status, 'CANCELLED', 'EXPIRED', actorId, 'Request cancelled');
    }
  }

  private async view(r: Full, withImages: boolean, staff = false) {
    const quote = r.quoteAmount ? dec(r.quoteAmount) : null;
    const deposit = r.depositAmount ? dec(r.depositAmount) : null;
    const expired = Boolean(r.quoteValidUntil && r.quoteValidUntil < todayUtc());
    const latestDeposit = r.orders[0];
    return {
      reference: r.reference,
      status: r.status,
      service: { slug: r.service.slug, name: r.service.name },
      eventDate: day(r.eventDate),
      guestCount: r.guestCount,
      budget: r.budget ? money(r.budget) : null,
      fulfilmentPreference: r.fulfilmentPreference,
      location: r.location,
      notes: r.notes,
      contactPhone: r.contactPhone,
      images: withImages ? await this.storage.signedUrls(r.referenceImages) : [],
      imageCount: r.referenceImages.length,
      quote: quote
        ? { amount: money(quote), deposit: money(deposit ?? 0), balance: money(quote.sub(deposit ?? 0)), validUntil: day(r.quoteValidUntil), note: r.quoteNote, quotedAt: r.quotedAt, expired }
        : null,
      acceptedAt: r.acceptedAt,
      depositPaidAt: r.depositPaidAt,
      closedReason: r.closedReason,
      createdAt: r.createdAt,
      depositOrder: latestDeposit ? { orderNumber: latestDeposit.orderNumber, status: latestDeposit.status, paymentStatus: latestDeposit.paymentStatus } : null,
      actions: {
        accept: r.status === 'QUOTED' && !expired,
        decline: r.status === 'QUOTED',
        payDeposit: r.status === 'ACCEPTED',
        cancel: CUSTOMER_CANCELLABLE.includes(r.status),
      },
      ...(staff
        ? {
            customer: { name: r.user.name, email: r.user.email, phone: r.user.phone },
            staffNotes: r.staffNotes,
            orders: r.orders.map((o) => ({ orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, total: money(o.total), placedAt: o.placedAt, needsReconciliation: o.needsReconciliation })),
            staffActions: {
              quote: QUOTABLE.includes(r.status),
              reject: STAFF_ALLOWED.REJECTED.includes(r.status),
              complete: STAFF_ALLOWED.COMPLETED.includes(r.status),
              cancel: STAFF_ALLOWED.CANCELLED.includes(r.status),
            },
          }
        : {}),
    };
  }
}
