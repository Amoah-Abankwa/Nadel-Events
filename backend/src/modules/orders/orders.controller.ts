import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get(':orderNumber/status')
  status(@Param('orderNumber') orderNumber: string, @CurrentUser() user: AuthUser) {
    return this.orders.status(user.id, orderNumber);
  }

  @HttpCode(200) @Post(':orderNumber/cancel')
  cancel(@Param('orderNumber') orderNumber: string, @CurrentUser() user: AuthUser) {
    return this.orders.cancel(user.id, orderNumber);
  }

  @HttpCode(200) @Post(':orderNumber/reorder')
  reorder(@Param('orderNumber') orderNumber: string, @CurrentUser() user: AuthUser) {
    return this.orders.reorder(user.id, orderNumber);
  }
}
