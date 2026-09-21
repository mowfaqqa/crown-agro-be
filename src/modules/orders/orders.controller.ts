import { Body, Controller, Get, Query, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CreateOrderDto } from "./dto/create-order.dto";
import { LookupOrderDto } from "./dto/lookup-order.dto";
import { OrdersService } from "./orders.service";
import { CustomerAuthGuard } from "../../common/guards/customer-auth.guard";

type CustomerRequest = {
  user: { id: string; name: string; email: string; emailVerified: boolean };
};

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Throttle({ default: { ttl: 60_000, limit: 12 } })
  @UseGuards(CustomerAuthGuard)
  @Post()
  create(@Body() dto: CreateOrderDto, @Req() request: CustomerRequest) {
    return this.ordersService.create(dto, request.user);
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get("lookup")
  lookup(@Query() dto: LookupOrderDto) {
    return this.ordersService.lookup(dto);
  }
}
