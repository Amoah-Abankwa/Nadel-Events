import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Length, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/app.exception';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';

class CategoryDto {
  @IsOptional() @IsString() @Length(2, 80) name?: string;
  @IsOptional() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @Length(2, 80) slug?: string;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(500) description?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsUrl({ protocols: ['https'], require_protocol: true }) imageUrl?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() parentId?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  /** Working days; null = inherit (parent, then store default); 0 = not returnable. */
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsInt() @Min(0) @Max(60) returnWindowDays?: number | null;
}

@Roles('ADMIN')
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  @Get()
  list() {
    return this.prisma.category.findMany({ orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }] });
  }

  @Post()
  async create(@Body() dto: CategoryDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    if (!dto.name || !dto.slug) throw new AppException(400, 'VALIDATION_ERROR', 'Name and slug are required.');
    const c = await this.prisma.category.create({ data: { ...dto, name: dto.name, slug: dto.slug } });
    this.settings.invalidateCategories();
    await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'category.create', resourceType: 'Category', resourceId: c.id, after: c });
    return c;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: CategoryDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    if (dto.parentId === id) throw new AppException(400, 'VALIDATION_ERROR', 'A category cannot be its own parent.');
    const before = await this.prisma.category.findUniqueOrThrow({ where: { id } });
    const after = await this.prisma.category.update({ where: { id }, data: dto });
    this.settings.invalidateCategories();
    await this.audit.record({ actorId: user.id, requestId: req.requestId, action: 'category.update', resourceType: 'Category', resourceId: id, before, after });
    return after;
  }
}
