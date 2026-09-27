import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInvestmentInterestDto } from "./dto/create-investment-interest.dto";
import { InvestmentQueryDto } from "./dto/investment-query.dto";

type CustomerIdentity = { id: string; name: string; email: string; emailVerified: boolean };

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async findAll(query: InvestmentQueryDto) {
    const publishedWhere: Prisma.InvestmentOpportunityWhereInput = {
      archivedAt: null,
      publishedAt: { lte: new Date() }
    };
    const where: Prisma.InvestmentOpportunityWhereInput = { ...publishedWhere };
    if (query.category) where.category = query.category;
    if (query.location?.trim()) where.location = { equals: query.location.trim(), mode: "insensitive" };
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } }
      ];
    }

    const [items, grouped, locationRows] = await Promise.all([
      this.prisma.investmentOpportunity.findMany({
        where,
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        take: 60
      }),
      this.prisma.investmentOpportunity.groupBy({
        by: ["category"],
        where: publishedWhere,
        _count: { _all: true }
      }),
      this.prisma.investmentOpportunity.findMany({
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
    return this.prisma.investmentOpportunity.findFirst({
      where: { slug, archivedAt: null, publishedAt: { lte: new Date() } }
    });
  }

  async expressInterest(opportunityId: string, dto: CreateInvestmentInterestDto, customer: CustomerIdentity) {
    if (!customer.emailVerified) throw new ForbiddenException("Verify your email before expressing interest");

    const opportunity = await this.prisma.investmentOpportunity.findFirst({
      where: { id: opportunityId, archivedAt: null, publishedAt: { lte: new Date() } }
    });
    if (!opportunity) throw new NotFoundException("Investment opportunity not found");
    if (!opportunity.openForInterest) throw new ForbiddenException("This opportunity is not accepting expressions of interest");

    const existing = await this.prisma.investmentInterest.findUnique({
      where: { opportunityId_customerId: { opportunityId, customerId: customer.id } }
    });
    if (existing) throw new ConflictException("You have already expressed interest in this opportunity");

    const interest = await this.prisma.investmentInterest.create({
      data: {
        opportunityId,
        customerId: customer.id,
        investorType: dto.investorType,
        organizationName: dto.organizationName?.trim() || null,
        phone: dto.phone.trim(),
        indicativeAmount: dto.indicativeAmount,
        message: dto.message.trim()
      }
    });

    await Promise.all([
      this.notifications.sendInvestmentInterest({
        opportunityTitle: opportunity.title,
        customerName: customer.name,
        customerEmail: customer.email,
        investorType: interest.investorType,
        organizationName: interest.organizationName,
        phone: interest.phone,
        indicativeAmount: interest.indicativeAmount,
        message: interest.message
      }),
      this.notifications.sendInvestmentInterestAcknowledgement(customer.email, customer.name, opportunity.title)
    ]);

    return { id: interest.id, status: interest.status, createdAt: interest.createdAt };
  }
}
