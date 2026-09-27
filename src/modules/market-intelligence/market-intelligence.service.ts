import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MarketIntelligenceQueryDto } from "./dto/market-intelligence-query.dto";

@Injectable()
export class MarketIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: MarketIntelligenceQueryDto) {
    const where: Prisma.MarketInsightWhereInput = {
      archivedAt: null,
      publishedAt: { lte: new Date() }
    };
    if (query.type) where.type = query.type;
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { commodity: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } }
      ];
    }

    const [items, grouped] = await Promise.all([
      this.prisma.marketInsight.findMany({
        where,
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        take: 48
      }),
      this.prisma.marketInsight.groupBy({
        by: ["type"],
        where: { archivedAt: null, publishedAt: { lte: new Date() } },
        _count: { _all: true }
      })
    ]);

    return {
      items,
      counts: Object.fromEntries(grouped.map((row) => [row.type, row._count._all]))
    };
  }

  findBySlug(slug: string) {
    return this.prisma.marketInsight.findFirst({
      where: { slug, archivedAt: null, publishedAt: { lte: new Date() } }
    });
  }
}
