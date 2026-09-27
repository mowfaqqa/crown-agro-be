import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CustomerAuthGuard } from "../../common/guards/customer-auth.guard";
import { CreateInvestmentInterestDto } from "./dto/create-investment-interest.dto";
import { InvestmentQueryDto } from "./dto/investment-query.dto";
import { InvestmentsService } from "./investments.service";

type CustomerRequest = { user: { id: string; name: string; email: string; emailVerified: boolean } };

@Controller("investments")
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Get()
  findAll(@Query() query: InvestmentQueryDto) {
    return this.investmentsService.findAll(query);
  }

  @Get(":slug")
  async findBySlug(@Param("slug") slug: string) {
    const opportunity = await this.investmentsService.findBySlug(slug);
    if (!opportunity) throw new NotFoundException("Investment opportunity not found");
    return opportunity;
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @UseGuards(CustomerAuthGuard)
  @Post(":id/interests")
  expressInterest(@Param("id") id: string, @Body() dto: CreateInvestmentInterestDto, @Req() request: CustomerRequest) {
    return this.investmentsService.expressInterest(id, dto, request.user);
  }
}
