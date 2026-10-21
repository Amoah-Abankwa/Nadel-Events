import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { OriginCheckMiddleware } from './common/middleware/origin-check.middleware';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StorageModule } from './modules/storage/storage.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { ContactModule } from './modules/contact/contact.module';
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CatalogueModule } from './modules/catalogue/catalogue.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { OrdersModule } from './modules/orders/orders.module';
import { MeModule } from './modules/me/me.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    SettingsModule,
    StorageModule,
    ReviewsModule,
    AuthModule,
    NotificationsModule,
    InventoryModule,
    CatalogueModule,
    PaymentsModule,
    CheckoutModule,
    OrdersModule,
    MeModule,
    AdminModule,
    ServiceRequestsModule,
    NewsletterModule,
    ContactModule,
    MarketingModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: rate limit → authenticate → authorise.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, OriginCheckMiddleware).forRoutes('{*splat}');
  }
}
