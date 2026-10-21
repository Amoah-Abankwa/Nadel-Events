import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNumberString, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(120)
  paymentWindowMinutes?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60)
  returnWindowWorkingDays?: number;

  @IsOptional() @IsBoolean()
  pricesIncludeTax?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(90)
  serviceLeadDays?: number;

  @IsOptional() @IsBoolean()
  reviewsRequirePurchase?: boolean;

  @IsOptional() @IsArray() @ArrayMaxSize(100) @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true, message: 'Use YYYY-MM-DD dates' })
  publicHolidays?: string[];
}

export class TaxRateDto {
  @IsString() @Length(2, 60)
  name: string;

  /** Decimal fraction: "0.15" = 15%. */
  @IsNumberString() @Matches(/^0(\.\d{1,4})?$|^1(\.0{1,4})?$/, { message: 'Use a fraction between 0 and 1, e.g. 0.15' })
  rate: string;

  @IsOptional() @IsBoolean()
  appliesToDelivery?: boolean;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @Type(() => Number) @IsInt()
  sortOrder?: number;
}
