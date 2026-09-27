import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AdminService } from "./admin.service";
import { UpsertProductDto } from "./dto/admin-product.dto";
import { UpdateOrderNotesDto } from "./dto/update-order-notes.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { UpsertMarketInsightDto } from "./dto/admin-market-insight.dto";
import { UpsertServiceListingDto } from "./dto/admin-service-listing.dto";
import { UpdateServiceEnquiryDto } from "./dto/update-service-enquiry.dto";

@UseGuards(JwtAuthGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("stats")
  stats() {
    return this.adminService.stats();
  }

  @Get("products")
  products() {
    return this.adminService.products();
  }

  @Post("products")
  createProduct(@Body() dto: UpsertProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Patch("products/:id")
  updateProduct(@Param("id") id: string, @Body() dto: UpsertProductDto) {
    return this.adminService.updateProduct(id, dto);
  }

  @Patch("products/:id/archive")
  archiveProduct(@Param("id") id: string) {
    return this.adminService.archiveProduct(id);
  }

  @Patch("products/:id/unarchive")
  unarchiveProduct(@Param("id") id: string) {
    return this.adminService.unarchiveProduct(id);
  }

  @Get("market-intelligence")
  marketIntelligence() {
    return this.adminService.marketIntelligence();
  }

  @Post("market-intelligence")
  createMarketInsight(@Body() dto: UpsertMarketInsightDto) {
    return this.adminService.createMarketInsight(dto);
  }

  @Patch("market-intelligence/:id")
  updateMarketInsight(@Param("id") id: string, @Body() dto: UpsertMarketInsightDto) {
    return this.adminService.updateMarketInsight(id, dto);
  }

  @Patch("market-intelligence/:id/archive")
  archiveMarketInsight(@Param("id") id: string) {
    return this.adminService.setMarketInsightArchived(id, true);
  }

  @Patch("market-intelligence/:id/unarchive")
  unarchiveMarketInsight(@Param("id") id: string) {
    return this.adminService.setMarketInsightArchived(id, false);
  }

  @Get("services")
  services() {
    return this.adminService.services();
  }

  @Post("services")
  createService(@Body() dto: UpsertServiceListingDto) {
    return this.adminService.createService(dto);
  }

  @Patch("services/:id")
  updateService(@Param("id") id: string, @Body() dto: UpsertServiceListingDto) {
    return this.adminService.updateService(id, dto);
  }

  @Patch("services/:id/archive")
  archiveService(@Param("id") id: string) {
    return this.adminService.setServiceArchived(id, true);
  }

  @Patch("services/:id/unarchive")
  unarchiveService(@Param("id") id: string) {
    return this.adminService.setServiceArchived(id, false);
  }

  @Get("service-enquiries")
  serviceEnquiries() {
    return this.adminService.serviceEnquiries();
  }

  @Patch("service-enquiries/:id")
  updateServiceEnquiry(@Param("id") id: string, @Body() dto: UpdateServiceEnquiryDto) {
    return this.adminService.updateServiceEnquiry(id, dto);
  }

  @Get("orders")
  orders() {
    return this.adminService.orders();
  }

  @Patch("orders/:id/status")
  updateOrderStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.adminService.updateOrderStatus(id, dto.status);
  }

  @Patch("orders/:id/notes")
  updateOrderNotes(@Param("id") id: string, @Body() dto: UpdateOrderNotesDto) {
    return this.adminService.updateOrderNotes(id, dto);
  }
}
