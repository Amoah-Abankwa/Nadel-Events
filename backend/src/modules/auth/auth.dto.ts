import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { PHONE_MESSAGE, PHONE_RE } from '../../common/validation';

const trimLower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @Transform(trimLower) @IsEmail({}, { message: 'Enter a valid email address' }) @MaxLength(254)
  email: string;

  @IsString() @MinLength(10, { message: 'Use at least 10 characters' }) @MaxLength(128)
  password: string;

  @Transform(trim) @IsString() @Length(2, 80)
  name: string;

  @IsOptional() @Transform(trim) @Matches(PHONE_RE, { message: PHONE_MESSAGE })
  phone?: string;
}

export class LoginDto {
  @Transform(trimLower) @IsEmail()
  email: string;

  @IsString() @MaxLength(128)
  password: string;
}

export class ForgotPasswordDto {
  @Transform(trimLower) @IsEmail()
  email: string;
}

export class ChangePasswordDto {
  @IsString() @MaxLength(128)
  currentPassword: string;

  @IsString() @MinLength(10, { message: 'Use at least 10 characters' }) @MaxLength(128)
  newPassword: string;
}

export class DeleteAccountDto {
  @IsString() @MaxLength(128)
  password: string;
}

export class ResetPasswordDto {
  @IsString() @Length(20, 200)
  token: string;

  @IsString() @MinLength(10) @MaxLength(128)
  password: string;
}
