import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertProductDto } from "./dto/admin-product.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [products, orders, pendingOrders, lowStock, paidRevenue] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.product.count({ where: { stockQuantity: { lte: 20 } } }),
      this.prisma.order.aggregate({
        where: { status: { in: [OrderStatus.PAID, OrderStatus.FULFILLED] } },
        _sum: { subtotal: true }
      })
    ]);

    return {
      products,
      orders,
      pendingOrders,
      lowStock,
      revenue: paidRevenue._sum.subtotal ?? 0
    };
  }

  async products() {
    const products = await this.prisma.product.findMany({
      include: { seller: true, bulkPricing: { orderBy: { minQuantity: "asc" } } },
      orderBy: { updatedAt: "desc" }
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      currency: product.currency,
      category: product.category,
      countryOfOrigin: product.countryOfOrigin,
      stockQuantity: product.stockQuantity,
      unit: product.unit,
      imageUrl: product.imageUrl,
      halalCertified: product.halalCertified,
      exportCertified: product.exportCertified,
      featured: product.featured,
      sellerName: product.seller.name,
      sellerCountry: product.seller.country,
      bulkPricing: product.bulkPricing.map((price) => ({
        minQuantity: price.minQuantity,
        unitPrice: price.unitPrice
      }))
    }));
  }

  async createProduct(dto: UpsertProductDto) {
    const seller = await this.findOrCreateSeller(dto.sellerName, dto.sellerCountry);
    return this.prisma.product.create({
      data: this.productData(dto, seller.id)
    });
  }

  async updateProduct(id: string, dto: UpsertProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Product not found");

    const seller = await this.findOrCreateSeller(dto.sellerName, dto.sellerCountry);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...this.productScalarData(dto, seller.id),
        bulkPricing: {
          deleteMany: {},
          create: dto.bulkPricing
        }
      }
    });
  }

  async deleteProduct(id: string) {
    const orderItemCount = await this.prisma.orderItem.count({ where: { productId: id } });
    if (orderItemCount > 0) {
      throw new BadRequestException("Products attached to existing orders cannot be deleted");
    }
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  async orders() {
    return this.prisma.order.findMany({
      include: {
        items: {
          include: {
            product: {
              select: { name: true, unit: true, imageUrl: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status }
    });
  }

  private async findOrCreateSeller(name: string, country: string) {
    const existing = await this.prisma.seller.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        country: { equals: country, mode: "insensitive" }
      }
    });
    if (existing) return existing;

    return this.prisma.seller.create({
      data: {
        name,
        country,
        verified: true
      }
    });
  }

  private productData(dto: UpsertProductDto, sellerId: string): Prisma.ProductCreateInput {
    return {
      ...this.productScalarData(dto, sellerId),
      bulkPricing: {
        create: dto.bulkPricing
      }
    };
  }

  private productScalarData(dto: UpsertProductDto, sellerId: string) {
    return {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      price: dto.price,
      compareAtPrice: dto.compareAtPrice,
      category: dto.category,
      countryOfOrigin: dto.countryOfOrigin,
      stockQuantity: dto.stockQuantity,
      unit: dto.unit,
      imageUrl: dto.imageUrl,
      halalCertified: dto.halalCertified,
      exportCertified: dto.exportCertified,
      featured: dto.featured,
      seller: { connect: { id: sellerId } }
    };
  }
}
