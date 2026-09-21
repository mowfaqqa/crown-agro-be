import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { CustomerAuthGuard } from "../../common/guards/customer-auth.guard";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { CustomersService } from "./customers.service";

type CustomerRequest = Request & { user: { id: string } };

@UseGuards(CustomerAuthGuard)
@Controller("customers/me")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  profile(@Req() request: CustomerRequest) {
    return this.customersService.profile(request.user.id);
  }

  @Patch()
  updateProfile(@Req() request: CustomerRequest, @Body() dto: UpdateProfileDto) {
    return this.customersService.updateProfile(request.user.id, dto);
  }

  @Get("orders")
  orders(@Req() request: CustomerRequest) {
    return this.customersService.orders(request.user.id);
  }
}
