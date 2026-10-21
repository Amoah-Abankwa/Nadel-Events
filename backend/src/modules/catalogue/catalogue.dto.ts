import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PageQuery } from '../../common/utils/pagination';

export const SORTS = ['newest', 'price_asc', 'price_desc', 'name'] as const;
export type Sort = (typeof SORTS)[number];

export class ProductQuery extends PageQuery {
  @IsOptional() @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @IsString() @MaxLength(100)
  category?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minPrice?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  maxPrice?: number;

  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  inStock?: boolean;

  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  featured?: boolean;

  @IsOptional() @IsString() @MaxLength(60)
  brand?: string;

  /** Availability filter: "in" = can be bought now, "out" = sold out. */
  @IsOptional() @IsIn(['in', 'out'])
  stock?: 'in' | 'out';

  /** Only products with a "was" price above the current price. */
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  onSale?: boolean;

  @IsOptional() @IsIn(SORTS)
  sort: Sort = 'newest';
}
