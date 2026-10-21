import { Injectable } from '@nestjs/common';
import type { StoreSettings, TaxRate } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Tx } from '../../prisma/transaction';
import { dec } from '../../common/utils/money';
import type { TaxRule } from '../checkout/pricing';

const TTL_MS = 30_000;
const ID = 'default';

/** Owner-editable settings with a short in-memory cache (changes apply within ~30s on every instance). */
@Injectable()
export class SettingsService {
  private settings?: { value: StoreSettings; at: number };
  private taxes?: { value: TaxRate[]; at: number };
  private categories?: { value: Map<string, { parentId: string | null; returnWindowDays: number | null }>; at: number };

  constructor(private readonly prisma: PrismaService) {}

  async get(db?: Tx): Promise<StoreSettings> {
    if (!db && this.settings && Date.now() - this.settings.at < TTL_MS) return this.settings.value;
    const client = db ?? this.prisma;
    const value = (await client.storeSettings.findUnique({ where: { id: ID } })) ?? (await this.prisma.storeSettings.upsert({ where: { id: ID }, create: { id: ID }, update: {} }));
    if (!db) this.settings = { value, at: Date.now() };
    return value;
  }

  async update(data: Partial<Pick<StoreSettings, 'paymentWindowMinutes' | 'returnWindowWorkingDays' | 'pricesIncludeTax' | 'publicHolidays' | 'serviceLeadDays' | 'reviewsRequirePurchase'>>, actorId: string) {
    const value = await this.prisma.storeSettings.upsert({ where: { id: ID }, create: { id: ID, ...data, updatedBy: actorId }, update: { ...data, updatedBy: actorId } });
    this.settings = { value, at: Date.now() };
    return value;
  }

  async activeTaxes(db?: Tx): Promise<TaxRule[]> {
    let rows: TaxRate[];
    if (!db && this.taxes && Date.now() - this.taxes.at < TTL_MS) {
      rows = this.taxes.value;
    } else {
      rows = await (db ?? this.prisma).taxRate.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
      if (!db) this.taxes = { value: rows, at: Date.now() };
    }
    return rows.map((t) => ({ name: t.name, rate: dec(t.rate), appliesToDelivery: t.appliesToDelivery }));
  }

  invalidateTaxes() {
    this.taxes = undefined;
  }

  /**
   * Effective returns window in working days. First match wins:
   * product override -> its category -> parent categories -> store default.
   * Current policy: cakes 0 (not returnable), decoration & baking accessories 3, kitchenware 7.
   */
  async effectiveReturnDays(product: { returnWindowDays: number | null; categoryId: string }, db?: Tx): Promise<number> {
    if (product.returnWindowDays != null) return product.returnWindowDays;
    const days = await this.categoryReturnDays(product.categoryId, db);
    return days ?? (await this.get(db)).returnWindowWorkingDays;
  }

  /** Category's own or inherited window; null when nothing in the chain sets one. */
  async categoryReturnDays(categoryId: string, db?: Tx): Promise<number | null> {
    const map = await this.categoryMap(db);
    let id: string | null = categoryId;
    for (let depth = 0; id && depth < 20; depth++) {
      const c = map.get(id);
      if (!c) break;
      if (c.returnWindowDays != null) return c.returnWindowDays;
      id = c.parentId;
    }
    return null;
  }

  invalidateCategories() {
    this.categories = undefined;
  }

  private async categoryMap(db?: Tx) {
    if (!db && this.categories && Date.now() - this.categories.at < TTL_MS) return this.categories.value;
    const rows = await (db ?? this.prisma).category.findMany({ select: { id: true, parentId: true, returnWindowDays: true } });
    const value = new Map(rows.map((r) => [r.id, { parentId: r.parentId, returnWindowDays: r.returnWindowDays }]));
    if (!db) this.categories = { value, at: Date.now() };
    return value;
  }
}
