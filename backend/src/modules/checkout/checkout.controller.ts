import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { CheckoutService } from './checkout.service';
import { CartValidateDto, CreateOrderDto, EstimateDto, QuoteDto } from './dto/checkout.dto';

@Controller()
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Public() @Throttle({ default: { limit: 60, ttl: 60_000 } }) @HttpCode(200) @Post('cart/estimate')
  estimate(@Body() dto: EstimateDto) {
    return this.checkout.estimate(dto);
  }

  @Public() @HttpCode(200) @Post('cart/validate')
  validate(@Body() dto: CartValidateDto) {
    return this.checkout.validateCart(dto.lines);
  }

  @Public() @Get('delivery/zones')
  zones() {
    return this.checkout.deliveryZones();
  }

  @HttpCode(200) @Post('checkout/quote')
  quote(@Body() dto: QuoteDto, @CurrentUser() user: AuthUser) {
    return this.checkout.quote(user.id, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('checkout/orders')
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.checkout.createOrder(user.id, dto);
  }
}
