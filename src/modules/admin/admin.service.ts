import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertProductDto } from "./dto/admin-product.dto";
import { UpdateOrderNotesDto } from "./dto/update-order-notes.dto";
import { UpsertMarketInsightDto } from "./dto/admin-market-insight.dto";

const allowedOrderTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.AWAITING_PAYMENT, OrderStatus.CANCELLED],
  AWAITING_PAYMENT: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.FULFILLED],
  FULFILLED: [],
  CANCELLED: []
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [products, orders, pendingOrders, lowStock, paidRevenue] = await Promise.all([
      this.prisma.product.count({ where: { archivedAt: null } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.product.count({ where: { archivedAt: null, stockQuantity: { lte: 20 } } }),
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
      archivedAt: product.archivedAt,
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

  async archiveProduct(id: string) {
    await this.ensureProductExists(id);
    await this.prisma.product.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        featured: false
      }
    });
    return { ok: true };
  }

  async unarchiveProduct(id: string) {
    await this.ensureProductExists(id);
    await this.prisma.product.update({
      where: { id },
      data: { archivedAt: null }
    });
    return { ok: true };
  }

  marketIntelligence() {
    return this.prisma.marketInsight.findMany({
      orderBy: [{ archivedAt: "asc" }, { updatedAt: "desc" }]
    });
  }

  createMarketInsight(dto: UpsertMarketInsightDto) {
    return this.prisma.marketInsight.create({ data: this.marketInsightData(dto) });
  }

  async updateMarketInsight(id: string, dto: UpsertMarketInsightDto) {
    const existing = await this.ensureMarketInsightExists(id);
    return this.prisma.marketInsight.update({
      where: { id },
      data: this.marketInsightData(dto, existing.publishedAt)
    });
  }

  async setMarketInsightArchived(id: string, archived: boolean) {
    await this.ensureMarketInsightExists(id);
    await this.prisma.marketInsight.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null, featured: archived ? false : undefined }
    });
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
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true }
      });
      if (!order) throw new NotFoundException("Order not found");
      if (order.status === status) {
        return tx.order.findUniqueOrThrow({ where: { id }, include: this.orderInclude() });
      }
      if (!allowedOrderTransitions[order.status].includes(status)) {
        throw new BadRequestException(`Order cannot move from ${order.status} to ${status}`);
      }

      const updated = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status }
      });
      if (updated.count !== 1) {
        throw new ConflictException("Order status changed. Refresh and try again");
      }

      if (status === OrderStatus.CANCELLED) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } }
          });
        }
      }

      return tx.order.findUniqueOrThrow({ where: { id }, include: this.orderInclude() });
    });
  }

  async updateOrderNotes(id: string, dto: UpdateOrderNotesDto) {
    return this.prisma.order.update({
      where: { id },
      data: {
        fulfillmentNotes: dto.fulfillmentNotes?.trim() || null
      },
      include: this.orderInclude()
    });
  }

  private async ensureProductExists(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Product not found");
  }

  private async ensureMarketInsightExists(id: string) {
    const existing = await this.prisma.marketInsight.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Market intelligence entry not found");
    return existing;
  }

  private marketInsightData(dto: UpsertMarketInsightDto, publishedAt?: Date | null) {
    return {
      title: dto.title.trim(),
      slug: dto.slug.trim().toLowerCase(),
      summary: dto.summary.trim(),
      content: dto.content.trim(),
      type: dto.type,
      imageUrl: dto.imageUrl?.trim() || null,
      location: dto.location?.trim() || null,
      commodity: dto.commodity?.trim() || null,
      dataValue: dto.dataValue?.trim() || null,
      sourceName: dto.sourceName?.trim() || null,
      sourceUrl: dto.sourceUrl?.trim() || null,
      featured: dto.featured,
      publishedAt: dto.published ? publishedAt ?? new Date() : null
    };
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

  private orderInclude() {
    return {
      items: {
        include: {
          product: {
            select: { name: true, unit: true, imageUrl: true }
          }
        }
      }
    } satisfies Prisma.OrderInclude;
  }
}
