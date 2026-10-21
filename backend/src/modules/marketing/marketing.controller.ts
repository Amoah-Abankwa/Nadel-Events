import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn } from 'class-validator';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { BannerDto, CampaignDto, EnterDto, GiveawayDto, PLACEMENTS, RedrawDto } from './marketing.dto';
import { MarketingService } from './marketing.service';

class PlacementQuery {
  @IsIn(PLACEMENTS) placement: string;
}

@Controller()
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  // ----- public -----
  @Public() @Get('banners')
  banners(@Query() q: PlacementQuery) {
    return this.marketing.activeBanners(q.placement);
  }

  @Public() @Throttle({ default: { limit: 60, ttl: 60_000 } }) @HttpCode(204) @Post('banners/:id/click')
  async click(@Param('id') id: string) {
    await this.marketing.click(id);
  }

  @Public() @Get('campaigns/active')
  campaigns() {
    return this.marketing.activeCampaigns();
  }

  /** Staff can preview unpublished campaigns. */
  @Public() @Get('campaigns/:slug')
  campaign(@Param('slug') slug: string, @Req() req: Request) {
    const staff = req.user && req.user.role !== 'CUSTOMER';
    return this.marketing.campaignPage(slug, Boolean(staff));
  }

  @Public() @Get('giveaways')
  giveaways() {
    return this.marketing.publicGiveaways();
  }

  @Public() @Get('giveaways/:slug')
  giveaway(@Param('slug') slug: string, @Req() req: Request) {
    return this.marketing.giveaway(slug, req.user?.id);
  }

  @Throttle({ default: { limit: 10, ttl: 3_600_000 } }) @HttpCode(200) @Post('giveaways/:slug/enter')
  enter(@Param('slug') slug: string, @Body() _dto: EnterDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.marketing.enter(slug, user.id, req.ip);
  }

  // ----- admin -----
  @Roles('MARKETING') @Get('admin/banners')
  adminBanners() {
    return this.marketing.adminBanners();
  }

  @Roles('MARKETING') @Post('admin/banners')
  createBanner(@Body() dto: BannerDto, @CurrentUser() u: AuthUser, @Req() req: Request) {
    return this.marketing.saveBanner(null, dto, u.id, req.requestId);
  }

  @Roles('MARKETING') @Patch('admin/banners/:id')
  updateBanner(@Param('id') id: string, @Body() dto: BannerDto, @CurrentUser() u: AuthUser, @Req() req: Request) {
    return this.marketing.saveBanner(id, dto, u.id, req.requestId);
  }

  @Roles('MARKETING') @Get('admin/campaigns')
  adminCampaigns() {
    return this.marketing.adminCampaigns();
  }

  @Roles('MARKETING') @Post('admin/campaigns')
  createCampaign(@Body() dto: CampaignDto, @CurrentUser() u: AuthUser, @Req() req: Request) {
    return this.marketing.saveCampaign(null, dto, u.id, req.requestId);
  }

  @Roles('MARKETING') @Patch('admin/campaigns/:id')
  updateCampaign(@Param('id') id: string, @Body() dto: CampaignDto, @CurrentUser() u: AuthUser, @Req() req: Request) {
    return this.marketing.saveCampaign(id, dto, u.id, req.requestId);
  }

  @Roles('MARKETING') @Get('admin/giveaways')
  adminGiveaways() {
    return this.marketing.adminGiveaways();
  }

  @Roles('MARKETING') @Post('admin/giveaways')
  createGiveaway(@Body() dto: GiveawayDto, @CurrentUser() u: AuthUser, @Req() req: Request) {
    return this.marketing.saveGiveaway(null, dto, u.id, req.requestId);
  }

  @Roles('MARKETING') @Patch('admin/giveaways/:id')
  updateGiveaway(@Param('id') id: string, @Body() dto: GiveawayDto, @CurrentUser() u: AuthUser, @Req() req: Request) {
    return this.marketing.saveGiveaway(id, dto, u.id, req.requestId);
  }

  @Roles('MARKETING') @HttpCode(200) @Post('admin/giveaways/:id/draw')
  draw(@Param('id') id: string, @CurrentUser() u: AuthUser, @Req() req: Request) {
    return this.marketing.draw(id, u.id, req.requestId);
  }

  @Roles('ADMIN') @HttpCode(200) @Post('admin/giveaways/:id/redraw')
  redraw(@Param('id') id: string, @Body() dto: RedrawDto, @CurrentUser() u: AuthUser, @Req() req: Request) {
    return this.marketing.draw(id, u.id, req.requestId, dto.reason);
  }
}
