import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { PageQuery } from '../../common/utils/pagination';
import { StorageService } from '../storage/storage.service';
import { AdminRequestQuery, ConfirmUploadDto, CreateServiceRequestDto, DeclineDto, QuoteDto, StaffNotesDto, StaffStatusDto } from './service-requests.dto';
import { ServiceRequestsService } from './service-requests.service';

@Controller()
export class ServiceRequestsController {
  constructor(
    private readonly requests: ServiceRequestsService,
    private readonly storage: StorageService,
  ) {}

  @Public() @Get('services')
  services() {
    return this.requests.services();
  }

  // ----- customer -----

  /** Reference photos: signed direct upload to a private Cloudinary folder for this customer. */
  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @HttpCode(200) @Post('service-requests/uploads/signature')
  signUpload(@CurrentUser() user: AuthUser) {
    return this.storage.signUpload('request', user.id);
  }

  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @HttpCode(200) @Post('service-requests/uploads/confirm')
  confirmUpload(@Body() dto: ConfirmUploadDto, @CurrentUser() user: AuthUser) {
    return this.storage.confirmRequestPhoto(user.id, dto.publicId);
  }

  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @Post('service-requests')
  create(@Body() dto: CreateServiceRequestDto, @CurrentUser() user: AuthUser) {
    return this.requests.create(user.id, dto);
  }

  @Get('me/service-requests')
  mine(@CurrentUser() user: AuthUser, @Query() q: PageQuery) {
    return this.requests.listMine(user.id, q);
  }

  @Get('me/service-requests/:ref')
  one(@CurrentUser() user: AuthUser, @Param('ref') ref: string) {
    return this.requests.getMine(user.id, ref);
  }

  @HttpCode(200) @Post('me/service-requests/:ref/accept')
  accept(@CurrentUser() user: AuthUser, @Param('ref') ref: string) {
    return this.requests.accept(user.id, ref);
  }

  @HttpCode(200) @Post('me/service-requests/:ref/pay-deposit')
  pay(@CurrentUser() user: AuthUser, @Param('ref') ref: string) {
    return this.requests.payDeposit(user.id, ref);
  }

  @HttpCode(200) @Post('me/service-requests/:ref/decline')
  decline(@CurrentUser() user: AuthUser, @Param('ref') ref: string, @Body() dto: DeclineDto) {
    return this.requests.decline(user.id, ref, dto.reason);
  }

  @HttpCode(200) @Post('me/service-requests/:ref/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('ref') ref: string, @Body() dto: DeclineDto) {
    return this.requests.cancelMine(user.id, ref, dto.reason);
  }

  // ----- staff -----

  @Roles('FULFILMENT') @Get('admin/service-requests')
  adminList(@Query() q: AdminRequestQuery) {
    return this.requests.adminList(q);
  }

  @Roles('FULFILMENT') @Get('admin/service-requests/:ref')
  adminGet(@Param('ref') ref: string) {
    return this.requests.adminGet(ref);
  }

  @Roles('FULFILMENT') @HttpCode(200) @Post('admin/service-requests/:ref/quote')
  quote(@Param('ref') ref: string, @Body() dto: QuoteDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.requests.quote(ref, dto, user.id, req.requestId);
  }

  @Roles('FULFILMENT') @HttpCode(200) @Post('admin/service-requests/:ref/status')
  status(@Param('ref') ref: string, @Body() dto: StaffStatusDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.requests.staffStatus(ref, dto, user.id, req.requestId);
  }

  @Roles('FULFILMENT') @Patch('admin/service-requests/:ref/notes')
  notes(@Param('ref') ref: string, @Body() dto: StaffNotesDto) {
    return this.requests.staffNotes(ref, dto.staffNotes);
  }
}
