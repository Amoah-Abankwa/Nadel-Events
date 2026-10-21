import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { GHANA_REGIONS } from '../../common/ghana';
import { AddressDto } from '../checkout/dto/checkout.dto';
import { PHONE_MESSAGE, PHONE_RE } from '../../common/validation';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateProfileDto {
  @IsOptional() @Transform(trim) @IsString() @Length(2, 80)
  name?: string;

  @IsOptional() @Transform(trim) @Matches(PHONE_RE, { message: PHONE_MESSAGE })
  phone?: string;
}

export class SaveAddressDto extends AddressDto {
  @IsOptional() @IsBoolean()
  isDefault?: boolean;
}

export class PatchAddressDto {
  @IsOptional() @Transform(trim) @IsString() @Length(2, 80) recipientName?: string;
  @IsOptional() @Transform(trim) @Matches(PHONE_RE, { message: PHONE_MESSAGE }) phone?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(4, 200) addressLine?: string;
  @IsOptional() @IsIn(GHANA_REGIONS) region?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(2, 80) area?: string;
  @IsOptional() @Transform(trim) @IsString() @Length(2, 80) city?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300) deliveryInstructions?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
