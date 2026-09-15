import { Injectable } from "@nestjs/common";
import { Category, Prisma } from "@prisma/client";
import { ProductQueryDto } from "./dto/product-query.dto";
import { PrismaService } from "../prisma/prisma.service";

const categoryMap: Record<string, Category> = {
  Fruits: Category.FRUITS,
  Grains: Category.GRAINS,
  Vegetables: Category.VEGETABLES,
  Livestock: Category.LIVESTOCK,
  Poultry: Category.POULTRY,
  Fish: Category.FISH,
  Equipment: Category.EQUIPMENT,
  "Processed Foods": Category.PROCESSED_FOODS
};

function fromDbCategory(category: Category) {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { seller: { name: { contains: query.search, mode: "insensitive" } } }
      ];
    }
    if (query.category && categoryMap[query.category]) {
      where.category = categoryMap[query.category];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: { seller: true, bulkPricing: { orderBy: { minQuantity: "asc" } } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }]
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? undefined,
      currency: "NGN",
      category: fromDbCategory(product.category),
      countryOfOrigin: product.countryOfOrigin,
      sellerName: product.seller.name,
      stockQuantity: product.stockQuantity,
      unit: product.unit,
      imageUrl: product.imageUrl,
      halalCertified: product.halalCertified,
      exportCertified: product.exportCertified,
      bulkPricing: product.bulkPricing.map((price) => ({
        minQuantity: price.minQuantity,
        unitPrice: price.unitPrice
      })),
      featured: product.featured
    }));
  }
}
