import { Body, Controller, Get, Post, Query, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import { CookieOptions, Request, Response } from "express";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { CustomerAuthGuard } from "../../common/guards/customer-auth.guard";
import { AuthService } from "./auth.service";
import { EmailTokenDto } from "./dto/email-token.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

const REFRESH_COOKIE = "zd_refresh";
const GOOGLE_STATE_COOKIE = "zd_google_state";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService
  ) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("customer/register")
  async registerCustomer(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const issued = await this.authService.registerCustomer(dto);
    this.setRefreshCookie(response, issued.refreshToken);
    return issued.session;
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("customer/login")
  async loginCustomer(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const issued = await this.authService.loginCustomer(dto);
    this.setRefreshCookie(response, issued.refreshToken);
    return issued.session;
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post("customer/refresh")
  async refreshCustomer(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const issued = await this.authService.refreshCustomer(this.readCookie(request, REFRESH_COOKIE));
    this.setRefreshCookie(response, issued.refreshToken);
    return issued.session;
  }

  @Post("customer/logout")
  async logoutCustomer(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.logoutCustomer(this.readOptionalCookie(request, REFRESH_COOKIE));
    response.clearCookie(REFRESH_COOKIE, this.refreshCookieOptions());
    return { ok: true };
  }

  @Post("customer/verify-email")
  verifyEmail(@Body() dto: EmailTokenDto) {
    return this.authService.verifyEmail(dto);
  }

  @UseGuards(CustomerAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post("customer/resend-verification")
  resendVerification(@Req() request: Request & { user: { id: string } }) {
    return this.authService.resendVerification(request.user.id);
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post("customer/forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("customer/reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get("customer/providers")
  providers() {
    return this.authService.providers();
  }

  @UseGuards(CustomerAuthGuard)
  @Get("customer/me")
  customerProfile(@Req() request: Request & { user: { id: string; name: string; email: string; emailVerified: boolean } }) {
    return request.user;
  }

  @Get("google")
  google(@Res() response: Response) {
    const state = randomBytes(24).toString("base64url");
    response.cookie(GOOGLE_STATE_COOKIE, state, { ...this.baseCookieOptions(), path: "/auth/google", maxAge: 10 * 60 * 1000 });
    response.redirect(this.authService.googleAuthorizationUrl(state));
  }

  @Get("google/callback")
  async googleCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Req() request: Request,
    @Res() response: Response
  ) {
    const frontend = (this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000").replace(/\/$/, "");
    const expectedState = this.readOptionalCookie(request, GOOGLE_STATE_COOKIE);
    response.clearCookie(GOOGLE_STATE_COOKIE, { ...this.baseCookieOptions(), path: "/auth/google" });
    if (!code || !state || !expectedState || !this.safeEqual(state, expectedState)) {
      response.redirect(`${frontend}/login?social=error`);
      return;
    }
    try {
      const issued = await this.authService.loginWithGoogle(code);
      this.setRefreshCookie(response, issued.refreshToken);
      response.redirect(`${frontend}/login?social=success`);
    } catch {
      response.redirect(`${frontend}/login?social=error`);
    }
  }

  private setRefreshCookie(response: Response, token: string) {
    response.cookie(REFRESH_COOKIE, token, { ...this.refreshCookieOptions(), maxAge: 30 * 24 * 60 * 60 * 1000 });
  }

  private refreshCookieOptions(): CookieOptions {
    return { ...this.baseCookieOptions(), path: "/auth" };
  }

  private baseCookieOptions(): CookieOptions {
    const production = this.config.get<string>("NODE_ENV") === "production";
    return { httpOnly: true, secure: production, sameSite: production ? "none" : "lax" };
  }

  private readCookie(request: Request, name: string) {
    const value = this.readOptionalCookie(request, name);
    if (!value) throw new UnauthorizedException("Session expired. Sign in again");
    return value;
  }

  private readOptionalCookie(request: Request, name: string) {
    const raw = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return raw ? decodeURIComponent(raw.slice(name.length + 1)) : undefined;
  }

  private safeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}
