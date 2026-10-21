import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from './settings.service';
import { TaxRateDto, UpdateSettingsDto } from './settings.dto';

@Controller()
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Storefront-safe subset, used for checkout copy and the returns policy page. */
  @Public() @Get('settings')
  async publicSettings() {
    const s = await this.settings.get();
    const taxes = await this.settings.activeTaxes();
    return {
      currency: this.config.get('CURRENCY', { infer: true }),
      paymentWindowMinutes: s.paymentWindowMinutes,
      returnWindowWorkingDays: s.returnWindowWorkingDays,
      pricesIncludeTax: s.pricesIncludeTax,
      taxes: taxes.map((t) => ({ name: t.name, ratePercent: t.rate.mul(100).toDecimalPlaces(2).toString() })),
    };
  }

  @Roles('ADMIN') @Get('admin/settings')
  get() {
    return this.settings.get();
  }

  @Roles('ADMIN') @Patch('admin/settings')
  async update(@Body() dto: UpdateSettingsDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const before = await this.settings.get();
    const after = await this.settings.update(dto, user.id);
    await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'settings.update', resourceType: 'StoreSettings', resourceId: after.id, before, after });
    return after;
  }

  @Roles('ADMIN') @Get('admin/tax-rates')
  taxRates() {
    return this.prisma.taxRate.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  @Roles('ADMIN') @Post('admin/tax-rates')
  async createTax(@Body() dto: TaxRateDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const t = await this.prisma.taxRate.create({ data: dto });
    this.settings.invalidateTaxes();
    await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'tax_rate.create', resourceType: 'TaxRate', resourceId: t.id, after: t });
    return t;
  }

  @Roles('ADMIN') @Patch('admin/tax-rates/:id')
  async updateTax(@Param('id') id: string, @Body() dto: TaxRateDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const before = await this.prisma.taxRate.findUniqueOrThrow({ where: { id } });
    const t = await this.prisma.taxRate.update({ where: { id }, data: dto });
    this.settings.invalidateTaxes();
    await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'tax_rate.update', resourceType: 'TaxRate', resourceId: id, before, after: t });
    return t;
  }
}
