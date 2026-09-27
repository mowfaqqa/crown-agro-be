import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateServiceEnquiryDto } from "./dto/create-service-enquiry.dto";
import { ServiceDirectoryQueryDto } from "./dto/service-directory-query.dto";

type CustomerIdentity = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};

@Injectable()
export class ServiceDirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async findAll(query: ServiceDirectoryQueryDto) {
    const publishedWhere: Prisma.ServiceListingWhereInput = {
      archivedAt: null,
      publishedAt: { lte: new Date() }
    };
    const where: Prisma.ServiceListingWhereInput = { ...publishedWhere };
    if (query.category) where.category = query.category;
    if (query.location?.trim()) {
      where.location = { equals: query.location.trim(), mode: "insensitive" };
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { providerName: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } }
      ];
    }

    const [items, grouped, locationRows] = await Promise.all([
      this.prisma.serviceListing.findMany({
        where,
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        take: 60
      }),
      this.prisma.serviceListing.groupBy({
        by: ["category"],
        where: publishedWhere,
        _count: { _all: true }
      }),
      this.prisma.serviceListing.findMany({
        where: { ...publishedWhere, location: { not: null } },
        distinct: ["location"],
        select: { location: true },
        orderBy: { location: "asc" }
      })
    ]);

    return {
      items,
      counts: Object.fromEntries(grouped.map((row) => [row.category, row._count._all])),
      locations: locationRows.flatMap((row) => row.location ? [row.location] : [])
    };
  }

  findBySlug(slug: string) {
    return this.prisma.serviceListing.findFirst({
      where: { slug, archivedAt: null, publishedAt: { lte: new Date() } }
    });
  }

  async createEnquiry(serviceId: string, dto: CreateServiceEnquiryDto, customer: CustomerIdentity) {
    if (!customer.emailVerified) {
      throw new ForbiddenException("Verify your email before sending an enquiry");
    }

    const service = await this.prisma.serviceListing.findFirst({
      where: { id: serviceId, archivedAt: null, publishedAt: { lte: new Date() } }
    });
    if (!service) throw new NotFoundException("Service not found");

    const enquiry = await this.prisma.serviceEnquiry.create({
      data: {
        serviceId,
        customerId: customer.id,
        phone: dto.phone.trim(),
        message: dto.message.trim()
      }
    });

    await this.notifications.sendServiceEnquiry({
      serviceTitle: service.title,
      customerName: customer.name,
      customerEmail: customer.email,
      phone: enquiry.phone,
      message: enquiry.message
    });

    return { id: enquiry.id, status: enquiry.status, createdAt: enquiry.createdAt };
  }
}
