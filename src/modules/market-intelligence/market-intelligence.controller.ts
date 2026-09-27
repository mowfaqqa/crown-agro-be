import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { MarketIntelligenceQueryDto } from "./dto/market-intelligence-query.dto";
import { MarketIntelligenceService } from "./market-intelligence.service";

@Controller("market-intelligence")
export class MarketIntelligenceController {
  constructor(private readonly marketIntelligenceService: MarketIntelligenceService) {}

  @Get()
  findAll(@Query() query: MarketIntelligenceQueryDto) {
    return this.marketIntelligenceService.findAll(query);
  }

  @Get(":slug")
  async findBySlug(@Param("slug") slug: string) {
    const insight = await this.marketIntelligenceService.findBySlug(slug);
    if (!insight) throw new NotFoundException("Market intelligence entry not found");
    return insight;
  }
}
