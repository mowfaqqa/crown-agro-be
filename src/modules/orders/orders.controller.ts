import { Body, Controller, Get, Query, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CreateOrderDto } from "./dto/create-order.dto";
import { LookupOrderDto } from "./dto/lookup-order.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Throttle({ default: { ttl: 60_000, limit: 12 } })
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get("lookup")
  lookup(@Query() dto: LookupOrderDto) {
    return this.ordersService.lookup(dto);
  }
}
