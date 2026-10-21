import { Module } from '@nestjs/common';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';

@Module({ imports: [CatalogueModule], controllers: [MarketingController], providers: [MarketingService] })
export class MarketingModule {}
