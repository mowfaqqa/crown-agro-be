import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { LookupOrderDto } from "./dto/lookup-order.dto";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async create(dto: CreateOrderDto) {
    const order = await this.prisma.$transaction(async (tx) => {
      const productIds = dto.items.map((item) => item.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      if (products.length !== productIds.length) {
        throw new BadRequestException("One or more products are unavailable");
      }

      const itemRows = dto.items.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product) throw new BadRequestException("Product is unavailable");
        if (item.quantity > product.stockQuantity) {
          throw new BadRequestException(`${product.name} only has ${product.stockQuantity} units available`);
        }
        return {
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price
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
          customerName: dto.customerName,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          deliveryCountry: dto.deliveryCountry,
          deliveryAddress: dto.deliveryAddress,
          notes: dto.notes,
          subtotal,
          items: { create: itemRows }
        }
      });

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: order.subtotal
      };
    });

    await this.notifications.orderCreated({
      orderNumber: order.orderNumber,
      email: dto.email.toLowerCase(),
      customerName: dto.customerName,
      subtotal: order.subtotal
    });

    return order;
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
}
