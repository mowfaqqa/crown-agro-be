import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException("Customer not found");
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      emailVerified: Boolean(customer.emailVerifiedAt)
    };
  }

  async updateProfile(customerId: string, dto: UpdateProfileDto) {
    await this.prisma.customer.update({ where: { id: customerId }, data: { name: dto.name.trim() } });
    return this.profile(customerId);
  }

  orders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: { select: { name: true, unit: true, imageUrl: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  serviceEnquiries(customerId: string) {
    return this.prisma.serviceEnquiry.findMany({
      where: { customerId },
      select: {
        id: true,
        phone: true,
        message: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        service: {
          select: {
            id: true,
            title: true,
            slug: true,
            providerName: true,
            location: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  investmentInterests(customerId: string) {
    return this.prisma.investmentInterest.findMany({
      where: { customerId },
      select: {
        id: true,
        investorType: true,
        organizationName: true,
        phone: true,
        indicativeAmount: true,
        message: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        opportunity: {
          select: {
            id: true,
            title: true,
            slug: true,
            location: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }
}
