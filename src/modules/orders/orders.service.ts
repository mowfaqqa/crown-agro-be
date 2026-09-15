import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
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

    const order = await this.prisma.order.create({
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

    return { id: order.id, orderNumber: order.orderNumber };
  }
}
