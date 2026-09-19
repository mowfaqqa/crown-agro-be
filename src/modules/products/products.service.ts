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
    const where: Prisma.ProductWhereInput = { archivedAt: null };
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
    if (query.country) where.countryOfOrigin = { equals: query.country, mode: "insensitive" };
    if (query.halal) where.halalCertified = true;
    if (query.exportCertified) where.exportCertified = true;
    if (query.availability === "in_stock") where.stockQuantity = { gt: 0 };
    if (query.availability === "out_of_stock") where.stockQuantity = 0;

    const sortOptions = {
      newest: [{ createdAt: "desc" }],
      price_asc: [{ price: "asc" }, { name: "asc" }],
      price_desc: [{ price: "desc" }, { name: "asc" }],
      name_asc: [{ name: "asc" }],
      featured: [{ featured: "desc" }, { createdAt: "desc" }]
    } satisfies Record<ProductQueryDto["sort"], Prisma.ProductOrderByWithRelationInput[]>;
    const orderBy = sortOptions[query.sort];

    const [products, total, countryRows] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { seller: true, bulkPricing: { orderBy: { minQuantity: "asc" } } },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where: { archivedAt: null },
        distinct: ["countryOfOrigin"],
        select: { countryOfOrigin: true },
        orderBy: { countryOfOrigin: "asc" }
      })
    ]);

    return {
      items: products.map((product) => this.serializeProduct(product)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      },
      filters: {
        countries: countryRows.map((row) => row.countryOfOrigin)
      }
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, archivedAt: null },
      include: { seller: true, bulkPricing: { orderBy: { minQuantity: "asc" } } }
    });
    return product ? this.serializeProduct(product) : null;
  }

  private serializeProduct(
    product: Prisma.ProductGetPayload<{
      include: { seller: true; bulkPricing: true };
    }>
  ) {
    return {
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
    };
  }
}
