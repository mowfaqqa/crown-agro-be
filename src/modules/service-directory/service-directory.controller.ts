import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CustomerAuthGuard } from "../../common/guards/customer-auth.guard";
import { CreateServiceEnquiryDto } from "./dto/create-service-enquiry.dto";
import { ServiceDirectoryQueryDto } from "./dto/service-directory-query.dto";
import { ServiceDirectoryService } from "./service-directory.service";

type CustomerRequest = {
  user: { id: string; name: string; email: string; emailVerified: boolean };
};

@Controller("services")
export class ServiceDirectoryController {
  constructor(private readonly serviceDirectoryService: ServiceDirectoryService) {}

  @Get()
  findAll(@Query() query: ServiceDirectoryQueryDto) {
    return this.serviceDirectoryService.findAll(query);
  }

  @Get(":slug")
  async findBySlug(@Param("slug") slug: string) {
    const service = await this.serviceDirectoryService.findBySlug(slug);
    if (!service) throw new NotFoundException("Service not found");
    return service;
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @UseGuards(CustomerAuthGuard)
  @Post(":id/enquiries")
  createEnquiry(
    @Param("id") id: string,
    @Body() dto: CreateServiceEnquiryDto,
    @Req() request: CustomerRequest
  ) {
    return this.serviceDirectoryService.createEnquiry(id, dto, request.user);
  }
}
