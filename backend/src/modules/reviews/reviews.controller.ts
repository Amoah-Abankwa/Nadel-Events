import { Body, Controller, Get, Param, Patch, Put, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PageQuery } from '../../common/utils/pagination';
import { ReviewsService } from './reviews.service';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

class ReviewDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) title?: string;
  @Transform(trim) @IsString() @Length(10, 2000, { message: 'Write at least 10 characters' }) body: string;
}

class ReviewQuery extends PageQuery {
  @IsOptional() @IsIn(['PENDING', 'APPROVED', 'REJECTED']) status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

class ModerateDto {
  @IsIn(['APPROVED', 'REJECTED']) status: 'APPROVED' | 'REJECTED';
}

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public() @Get('reviews/highlights')
  highlights(@Query('limit') limit?: string) {
    return this.reviews.highlights(Math.min(Math.max(Number(limit) || 3, 1), 10));
  }

  @Public() @Get('products/:slug/reviews')
  list(@Param('slug') slug: string, @Query() q: PageQuery, @Req() req: Request) {
    return this.reviews.listForProduct(slug, q, req.user?.id);
  }

  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Put('products/:slug/reviews/mine')
  upsert(@Param('slug') slug: string, @Body() dto: ReviewDto, @CurrentUser() user: AuthUser) {
    return this.reviews.upsert(user.id, slug, dto);
  }

  @Roles('ADMIN', 'MARKETING') @Get('admin/reviews')
  adminList(@Query() q: ReviewQuery) {
    return this.reviews.adminList(q);
  }

  @Roles('ADMIN', 'MARKETING') @Patch('admin/reviews/:id')
  moderate(@Param('id') id: string, @Body() dto: ModerateDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.reviews.moderate(id, dto.status, user.id, req.requestId);
  }
}
