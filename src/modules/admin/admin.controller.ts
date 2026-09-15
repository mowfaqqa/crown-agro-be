import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AdminService } from "./admin.service";
import { UpsertProductDto } from "./dto/admin-product.dto";
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

  @Delete("products/:id")
  deleteProduct(@Param("id") id: string) {
    return this.adminService.deleteProduct(id);
  }

  @Get("orders")
  orders() {
    return this.adminService.orders();
  }

  @Patch("orders/:id/status")
  updateOrderStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.adminService.updateOrderStatus(id, dto.status);
  }
}
