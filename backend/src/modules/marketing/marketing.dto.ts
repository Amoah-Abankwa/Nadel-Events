import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, Equals, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUrl, Length, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PLACEMENTS = ['decor.hero', 'decor.feature', 'cakes.hero', 'home.hero', 'home.promo', 'home.feature', 'home.sidebar', 'home.strip', 'category.top', 'product.below'] as const;
const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

/** Destination must be a path on this site or an https URL. */
const DEST = /^(\/[^\s]*|https:\/\/[^\s]+)$/;

export class BannerDto {
  @Transform(trim) @IsString() @Length(2, 120) title: string;
  @IsUrl({ protocols: ['https'], require_protocol: true }) desktopImage: string;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsUrl({ protocols: ['https'], require_protocol: true }) mobileImage?: string | null;
  @Transform(trim) @IsString() @Length(3, 200, { message: 'Describe the image for screen readers' }) altText: string;
  @IsIn(PLACEMENTS) placement: (typeof PLACEMENTS)[number];
  @Matches(DEST, { message: 'Use a page on this site (starting with /) or an https link' }) destinationUrl: string;
  @IsOptional() @IsBoolean() isSponsored?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000) priority?: number;
  @IsIn(STATUSES) status: (typeof STATUSES)[number];
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() startsAt?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() endsAt?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString() campaignId?: string | null;
}

export class CampaignDto {
  @Transform(trim) @IsString() @Length(2, 120) name: string;
  @Matches(SLUG) @Length(2, 80) slug: string;
  @IsIn(STATUSES) status: (typeof STATUSES)[number];
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() startsAt?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() endsAt?: string | null;
  @Transform(trim) @IsString() @Length(2, 160) headline: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(4000) body?: string;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsUrl({ protocols: ['https'], require_protocol: true }) heroImage?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(48) @IsString({ each: true }) productIds?: string[];
  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @Matches(/^[A-Z0-9_-]{3,32}$/) couponCode?: string | null;
}

export class GiveawayDto {
  @Transform(trim) @IsString() @Length(2, 120) title: string;
  @Matches(SLUG) @Length(2, 80) slug: string;
  @Transform(trim) @IsString() @Length(2, 200) prize: string;
  @Transform(trim) @IsString() @Length(10, 4000) description: string;
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsUrl({ protocols: ['https'], require_protocol: true }) imageUrl?: string | null;
  @Transform(trim) @IsString() @Length(50, 10000, { message: 'Write the full rules (eligibility, how the winner is chosen, privacy)' }) rules: string;
  @IsIn(STATUSES) status: (typeof STATUSES)[number];
  @IsDateString() opensAt: string;
  @IsDateString() closesAt: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) entryLimit: number;
}

export class EnterDto {
  @Equals(true, { message: 'Accept the rules to enter' }) acceptRules: boolean;
}

export class RedrawDto {
  @Transform(trim) @IsString() @Length(3, 300) reason: string;
}
