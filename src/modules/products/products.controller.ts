import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { ProductQueryDto } from "./dto/product-query.dto";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(":slug")
  async findBySlug(@Param("slug") slug: string) {
    const product = await this.productsService.findBySlug(slug);
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }
}
