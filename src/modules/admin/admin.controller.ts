import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AdminService } from "./admin.service";
import { UpsertProductDto } from "./dto/admin-product.dto";
import { UpdateOrderNotesDto } from "./dto/update-order-notes.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";

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
