import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ProductQuery } from './catalogue.dto';
import { CatalogueService } from './catalogue.service';

@Public()
@Controller()
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @Get('products')
  list(@Query() q: ProductQuery) {
    return this.catalogue.listProducts(q);
  }

  @Get('brands')
  brands() {
    return this.catalogue.brands();
  }

  @Get('products/recommendations')
  recommendations(@Query('ids') ids?: string, @Query('limit') limit?: string) {
    const list = (ids ?? '').split(',').map((s) => s.trim()).filter((s) => /^[a-z0-9]{8,40}$/i.test(s)).slice(0, 30);
    return this.catalogue.recommendations(list, Math.min(Math.max(Number(limit) || 8, 1), 16));
  }

  @Get('products/bestsellers')
  bestsellers(@Query('limit') limit?: string) {
    return this.catalogue.bestsellers(Math.min(Math.max(Number(limit) || 6, 1), 24));
  }

  @Get('products/:slug')
  get(@Param('slug') slug: string) {
    return this.catalogue.getProduct(slug);
  }

  @Get('categories')
  categories() {
    return this.catalogue.categoryTree();
  }

  @Get('categories/:slug')
  category(@Param('slug') slug: string) {
    return this.catalogue.getCategory(slug);
  }

  @Get('categories/:slug/products')
  categoryProducts(@Param('slug') slug: string, @Query() q: ProductQuery) {
    return this.catalogue.listProducts(Object.assign(q, { category: slug }));
  }
}
