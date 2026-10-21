import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { PageQuery } from '../../common/utils/pagination';
import { MONEY_RE, PHONE_MESSAGE, PHONE_RE } from '../../common/validation';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateServiceRequestDto {
  @IsString() @Length(2, 80)
  service: string; // slug

  @Matches(DATE, { message: 'Choose the event date' })
  eventDate: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5000)
  guestCount?: number;

  @IsOptional() @Matches(MONEY_RE, { message: 'Enter an amount like 800' })
  budget?: string;

  @IsIn(['PICKUP', 'DELIVERY', 'ON_SITE'])
  fulfilmentPreference: 'PICKUP' | 'DELIVERY' | 'ON_SITE';

  @IsOptional() @Transform(trim) @IsString() @MaxLength(200)
  location?: string;

  @Transform(trim) @IsString() @Length(10, 2000, { message: 'Tell us a bit more (at least 10 characters)' })
  notes: string;

  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true })
  referenceImages?: string[];

  @Transform(trim) @Matches(PHONE_RE, { message: PHONE_MESSAGE })
  contactPhone: string;
}

export class ConfirmUploadDto {
  @IsString() @Length(5, 300)
  publicId: string;
}

export class DeclineDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  reason?: string;
}

export class QuoteDto {
  @Matches(MONEY_RE, { message: 'Enter the full price, e.g. 1200' })
  quoteAmount: string;

  @Matches(MONEY_RE, { message: 'Enter the deposit, or 0 for none' })
  depositAmount: string;

  @Matches(DATE)
  quoteValidUntil: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000)
  quoteNote?: string;
}

export class StaffStatusDto {
  @IsIn(['REJECTED', 'COMPLETED', 'CANCELLED'])
  status: 'REJECTED' | 'COMPLETED' | 'CANCELLED';

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  reason?: string;
}

export class StaffNotesDto {
  @Transform(trim) @IsString() @MaxLength(4000)
  staffNotes: string;
}

export class AdminRequestQuery extends PageQuery {
  @IsOptional() @IsIn(['SUBMITTED', 'QUOTED', 'ACCEPTED', 'CONFIRMED', 'DECLINED', 'REJECTED', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(40)
  q?: string;
}
