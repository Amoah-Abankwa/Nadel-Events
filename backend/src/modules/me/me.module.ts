import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { MeController } from './me.controller';

@Module({ imports: [OrdersModule], controllers: [MeController] })
export class MeModule {}
