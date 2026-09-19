import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { CustomerAuthGuard } from "../../common/guards/customer-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("customer/register")
  registerCustomer(@Body() dto: RegisterDto) {
    return this.authService.registerCustomer(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("customer/login")
  loginCustomer(@Body() dto: LoginDto) {
    return this.authService.loginCustomer(dto);
  }

  @UseGuards(CustomerAuthGuard)
  @Get("customer/me")
  customerProfile(@Req() request: { user: { id: string; name: string; email: string } }) {
    return request.user;
  }
}
