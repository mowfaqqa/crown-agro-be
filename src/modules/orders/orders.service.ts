import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { LookupOrderDto } from "./dto/lookup-order.dto";
import { Prisma } from "@prisma/client";

type AuthenticatedCustomer = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async create(dto: CreateOrderDto, customer: AuthenticatedCustomer) {
    if (!customer.emailVerified) {
      throw new ForbiddenException("Verify your email before placing an order");
    }
    const duplicate = await this.prisma.order.findFirst({
      where: { checkoutKey: dto.idempotencyKey, customerId: customer.id }
    });
    if (duplicate) return this.orderConfirmation(duplicate);

    const createOrder = () => this.prisma.$transaction(async (tx) => {
      const productIds = dto.items.map((item) => item.productId);
      if (new Set(productIds).size !== productIds.length) {
        throw new BadRequestException("Each product can only appear once in an order");
      }
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, archivedAt: null },
        include: { bulkPricing: { orderBy: { minQuantity: "asc" } } }
      });
      if (products.length !== productIds.length) {
        throw new BadRequestException("One or more products are unavailable");
      }

      const itemRows = dto.items.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product) throw new BadRequestException("Product is unavailable");
        if (product.stockQuantity === 0) {
          throw new BadRequestException(`${product.name} is out of stock`);
        }
        if (item.quantity > product.stockQuantity) {
          throw new BadRequestException(`${product.name} has only ${product.stockQuantity} ${product.unit}${product.stockQuantity === 1 ? "" : "s"} available`);
        }
        const unitPrice = product.bulkPricing.reduce(
          (price, tier) => (item.quantity >= tier.minQuantity ? tier.unitPrice : price),
          product.price
        );
        return {
          productId: product.id,
          quantity: item.quantity,
          unitPrice
        };
      });
      const subtotal = itemRows.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const orderNumber = `ZDC-${Date.now().toString(36).toUpperCase()}`;

      for (const item of itemRows) {
        const update = await tx.product.updateMany({
          where: {
            id: item.productId,
            stockQuantity: { gte: item.quantity }
          },
          data: {
            stockQuantity: { decrement: item.quantity }
          }
        });
        if (update.count !== 1) {
          throw new BadRequestException("One or more products no longer have enough stock");
        }
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerName: customer.name,
          email: customer.email,
          customerId: customer.id,
          checkoutKey: dto.idempotencyKey,
          phone: dto.phone,
          deliveryCountry: dto.deliveryCountry,
          deliveryAddress: dto.deliveryAddress,
          notes: dto.notes,
          subtotal,
          items: { create: itemRows }
        }
      });

      return order;
    });

    let order;
    try {
      order = await createOrder();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.prisma.order.findFirst({
          where: { checkoutKey: dto.idempotencyKey, customerId: customer.id }
        });
        if (existing) return this.orderConfirmation(existing);
      }
      throw error;
    }

    await this.notifications.orderCreated({
      orderNumber: order.orderNumber,
      email: customer.email,
      customerName: customer.name,
      subtotal: order.subtotal
    });

    return this.orderConfirmation(order);
  }

  async lookup(dto: LookupOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        orderNumber: dto.orderNumber.trim().toUpperCase(),
        email: dto.email.toLowerCase()
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                unit: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  private orderConfirmation(order: { id: string; orderNumber: string; status: string; subtotal: number }) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: order.subtotal
    };
  }
}
