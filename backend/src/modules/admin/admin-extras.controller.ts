import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Length, Matches, MaxLength, ValidateIf } from 'class-validator';
import type { Request } from 'express';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PageQuery, paginate } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

class AuditQuery extends PageQuery {
  @IsOptional() @IsString() @MaxLength(60) resourceType?: string;
  @IsOptional() @IsString() @MaxLength(60) action?: string;
  @IsOptional() @IsString() @MaxLength(60) resourceId?: string;
  @IsOptional() @IsString() @MaxLength(254) actor?: string; // email contains
}

class ServiceDto {
  @Transform(trim) @IsString() @Length(2, 80) name: string;
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @Length(2, 80) slug: string;
  @Transform(trim) @IsString() @Length(10, 500) description: string;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsUrl({ protocols: ['https'], require_protocol: true }) imageUrl?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

@Roles('ADMIN')
@Controller('admin')
export class AdminExtrasController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Who changed what. Read-only; entries are never edited or deleted from the app. */
  @Get('audit')
  async auditLog(@Query() q: AuditQuery) {
    let actorIds: string[] | undefined;
    if (q.actor) {
      actorIds = (await this.prisma.user.findMany({ where: { email: { contains: q.actor, mode: 'insensitive' } }, select: { id: true }, take: 50 })).map((u) => u.id);
    }
    const where: Prisma.AuditLogWhereInput = {
      ...(q.resourceType ? { resourceType: q.resourceType } : {}),
      ...(q.action ? { action: { startsWith: q.action } } : {}),
      ...(q.resourceId ? { resourceId: q.resourceId } : {}),
      ...(actorIds ? { actorId: { in: actorIds } } : {}),
    };
    const [rows, total, types] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ distinct: ['resourceType'], select: { resourceType: true } }),
    ]);
    const actors = await this.prisma.user.findMany({ where: { id: { in: rows.map((r) => r.actorId).filter((x): x is string => Boolean(x)) } }, select: { id: true, name: true, email: true } });
    const byId = new Map(actors.map((a) => [a.id, a]));
    return {
      ...paginate(rows.map((r) => ({ ...r, actor: r.actorId ? byId.get(r.actorId) ?? { id: r.actorId, name: 'Unknown', email: '' } : null })), total, q),
      resourceTypes: types.map((t) => t.resourceType).sort(),
    };
  }

  @Get('services')
  services() {
    return this.prisma.service.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { requests: true } } } });
  }

  @Post('services')
  async createService(@Body() dto: ServiceDto, @CurrentUser() u: AuthUser, @Req() req: Request) {
    const s = await this.prisma.service.create({ data: dto });
    await this.audit.record({ actorId: u.id, requestId: req.requestId, action: 'service.create', resourceType: 'Service', resourceId: s.id, after: dto });
    return s;
  }

  /** The slug is kept once requests exist, so old links and emails keep working. */
  @Patch('services/:id')
  async updateService(@Param('id') id: string, @Body() dto: ServiceDto, @CurrentUser() u: AuthUser, @Req() req: Request) {
    const before = await this.prisma.service.findUniqueOrThrow({ where: { id }, include: { _count: { select: { requests: true } } } });
    const data = before._count.requests > 0 ? { ...dto, slug: before.slug } : dto;
    const s = await this.prisma.service.update({ where: { id }, data });
    await this.audit.record({ actorId: u.id, requestId: req.requestId, action: 'service.update', resourceType: 'Service', resourceId: id, before, after: s });
    return s;
  }
}
