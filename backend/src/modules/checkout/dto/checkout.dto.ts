import { Transform, Type } from 'class-transformer';
import { GHANA_REGIONS } from '../../../common/ghana';
import { PHONE_MESSAGE, PHONE_RE } from '../../../common/validation';
import {
  ArrayMaxSize, ArrayMinSize, Equals, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID,
  Length, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

export class CartLineDto {
  @IsString() @Length(1, 40)
  variantId: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(99)
  quantity: number;
}

export class CartValidateDto {
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => CartLineDto)
  lines: CartLineDto[];
}

export class EstimateDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => CartLineDto)
  lines: CartLineDto[];

  @IsOptional() @Transform(upper) @IsString() @Length(3, 32)
  couponCode?: string;

  /** Omit for pickup. */
  @IsOptional() @IsIn(GHANA_REGIONS)
  deliveryRegion?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(80)
  deliveryArea?: string;
}

export class QuoteDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => CartLineDto)
  lines: CartLineDto[];

  @IsIn(['PICKUP', 'DELIVERY'])
  fulfilmentType: 'PICKUP' | 'DELIVERY';

  @ValidateIf((o: QuoteDto) => o.fulfilmentType === 'DELIVERY') @IsIn(GHANA_REGIONS, { message: 'Choose your region' })
  deliveryRegion?: string;

  /** Town or neighbourhood; may unlock an area-specific rate within the region. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80)
  deliveryArea?: string;

  @IsOptional() @Transform(upper) @IsString() @Length(3, 32)
  couponCode?: string;
}

export class AddressDto {
  @Transform(trim) @IsString() @Length(2, 80)
  recipientName: string;

  @Transform(trim) @Matches(PHONE_RE, { message: PHONE_MESSAGE })
  phone: string;

  @Transform(trim) @IsString() @Length(4, 200)
  addressLine: string;

  @IsIn(GHANA_REGIONS, { message: 'Choose your region' })
  region: string;

  @Transform(trim) @IsString() @Length(2, 80)
  area: string;

  @Transform(trim) @IsString() @Length(2, 80)
  city: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(300)
  deliveryInstructions?: string;
}

export class CreateOrderDto extends QuoteDto {
  /** Client-generated UUID per checkout attempt; a retried request returns the same order. */
  @IsUUID()
  checkoutKey: string;

  @Transform(trim) @Matches(PHONE_RE, { message: PHONE_MESSAGE })
  contactPhone: string;

  @ValidateIf((o: CreateOrderDto) => o.fulfilmentType === 'DELIVERY') @ValidateNested() @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  notes?: string;

  @Equals(true, { message: 'Accept the terms to place your order' })
  acceptTerms: boolean;
}
