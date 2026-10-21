import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, Length } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { StorageService } from '../storage/storage.service';

class ConfirmDto {
  @IsString() @Length(5, 300)
  publicId: string;
}

/** Product, banner and category photos: signed direct upload to Cloudinary, then confirm. */
@Roles('ADMIN', 'MARKETING')
@Controller('admin/uploads')
export class AdminUploadsController {
  constructor(private readonly storage: StorageService) {}

  @Throttle({ default: { limit: 120, ttl: 3_600_000 } })
  @HttpCode(200) @Post('signature')
  sign(@CurrentUser() user: AuthUser) {
    return this.storage.signUpload('catalogue', user.id);
  }

  @HttpCode(200) @Post('confirm')
  async confirm(@Body() dto: ConfirmDto) {
    return { url: await this.storage.confirmCatalogue(dto.publicId) };
  }
}
