import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { ContactModule } from '../contact/contact.module';
import { AdminCatalogueController } from './admin-catalogue.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminUploadsController } from './admin-uploads.controller';
import { AdminStaffController } from './admin-staff.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AdminExtrasController } from './admin-extras.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminSettingsController } from './admin-settings.controller';

@Module({
  imports: [PaymentsModule, ContactModule],
  controllers: [AdminCatalogueController, AdminCategoriesController, AdminUploadsController, AdminStaffController, AdminReportsController, AdminExtrasController, AdminOrdersController, AdminSettingsController],
})
export class AdminModule {}
