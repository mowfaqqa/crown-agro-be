import { Injectable } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

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
}
