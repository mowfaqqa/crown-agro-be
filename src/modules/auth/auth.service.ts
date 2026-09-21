import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Customer } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmailTokenDto } from "./dto/email-token.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

const DAY_MS = 24 * 60 * 60 * 1000;
const REFRESH_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!admin || !(await bcrypt.compare(dto.password, admin.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return {
      accessToken: await this.jwt.signAsync(
        { sub: admin.id, email: admin.email, role: admin.role, kind: "admin" },
        { expiresIn: this.config.get<string>("JWT_EXPIRES_IN") ?? "1d" }
      )
    };
  }

  async registerCustomer(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.customer.findUnique({ where: { email } });
    if (existing) throw new ConflictException("An account already exists for this email");

    const customer = await this.prisma.customer.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash: await bcrypt.hash(dto.password, 12)
      }
    });
    await this.issueVerificationEmail(customer);
    return this.issueCustomerSession(customer);
  }

  async loginCustomer(dto: LoginDto) {
    const customer = await this.prisma.customer.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!customer) throw new UnauthorizedException("Invalid credentials");
    if (!customer.passwordHash) throw new UnauthorizedException("Use Google to sign in to this account");
    if (!(await bcrypt.compare(dto.password, customer.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.issueCustomerSession(customer);
  }

  async refreshCustomer(rawToken: string) {
    const current = await this.prisma.refreshSession.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { customer: true }
    });
    if (!current || current.revokedAt || current.expiresAt <= new Date()) {
      throw new UnauthorizedException("Session expired. Sign in again");
    }

    const nextToken = this.createToken();
    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.refreshSession.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      if (claimed.count !== 1) throw new UnauthorizedException("Session expired. Sign in again");
      await transaction.refreshSession.create({
        data: {
          tokenHash: this.hashToken(nextToken),
          expiresAt: new Date(Date.now() + REFRESH_DAYS * DAY_MS),
          customerId: current.customerId
        }
      });
    });
    return { session: await this.accessSession(current.customer), refreshToken: nextToken };
  }

  async logoutCustomer(rawToken?: string) {
    if (rawToken) {
      await this.prisma.refreshSession.updateMany({
        where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
    return { ok: true };
  }

  async verifyEmail(dto: EmailTokenDto) {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.hashToken(dto.token) }
    });
    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new BadRequestException("Verification link is invalid or expired");
    }

    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.emailVerificationToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() }
      });
      if (claimed.count !== 1) throw new BadRequestException("Verification link is invalid or expired");
      await transaction.customer.update({ where: { id: record.customerId }, data: { emailVerifiedAt: new Date() } });
    });
    return { ok: true };
  }

  async resendVerification(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new UnauthorizedException("Customer account no longer exists");
    if (customer.emailVerifiedAt) return { ok: true };
    await this.issueVerificationEmail(customer);
    return { ok: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const customer = await this.prisma.customer.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (customer) {
      const token = this.createToken();
      await this.prisma.passwordResetToken.updateMany({
        where: { customerId: customer.id, usedAt: null },
        data: { usedAt: new Date() }
      });
      await this.prisma.passwordResetToken.create({
        data: {
          tokenHash: this.hashToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          customerId: customer.id
        }
      });
      await this.notifications.sendPasswordReset(customer.email, customer.name, token);
    }
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(dto.token) }
    });
    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new BadRequestException("Password reset link is invalid or expired");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() }
      });
      if (claimed.count !== 1) throw new BadRequestException("Password reset link is invalid or expired");
      await transaction.customer.update({
        where: { id: record.customerId },
        data: { passwordHash, emailVerifiedAt: new Date() }
      });
      await transaction.refreshSession.updateMany({
        where: { customerId: record.customerId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    });
    return { ok: true };
  }

  providers() {
    return { google: Boolean(this.config.get<string>("GOOGLE_CLIENT_ID") && this.config.get<string>("GOOGLE_CLIENT_SECRET")) };
  }

  googleAuthorizationUrl(state: string) {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const redirectUri = this.config.get<string>("GOOGLE_REDIRECT_URI");
    if (!clientId || !redirectUri || !this.config.get<string>("GOOGLE_CLIENT_SECRET")) {
      throw new ServiceUnavailableException("Google sign-in is not configured");
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account"
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async loginWithGoogle(code: string) {
    const clientId = this.config.getOrThrow<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.config.getOrThrow<string>("GOOGLE_CLIENT_SECRET");
    const redirectUri = this.config.getOrThrow<string>("GOOGLE_REDIRECT_URI");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" })
    });
    if (!tokenResponse.ok) throw new UnauthorizedException("Google sign-in could not be completed");
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) throw new UnauthorizedException("Google sign-in could not be completed");

    const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    if (!userResponse.ok) throw new UnauthorizedException("Google profile could not be loaded");
    const profile = await userResponse.json() as { sub?: string; email?: string; name?: string; email_verified?: boolean };
    if (!profile.sub || !profile.email || !profile.email_verified) {
      throw new UnauthorizedException("Google did not provide a verified email");
    }

    const email = profile.email.toLowerCase();
    const [googleCustomer, emailCustomer] = await Promise.all([
      this.prisma.customer.findUnique({ where: { googleId: profile.sub } }),
      this.prisma.customer.findUnique({ where: { email } })
    ]);
    if (googleCustomer && emailCustomer && googleCustomer.id !== emailCustomer.id) {
      throw new UnauthorizedException("Google sign-in could not be linked to this account");
    }
    const existing = googleCustomer ?? emailCustomer;
    const customer = existing
      ? await this.prisma.customer.update({
          where: { id: existing.id },
          data: { googleId: profile.sub, emailVerifiedAt: existing.emailVerifiedAt ?? new Date(), name: existing.name || profile.name || email }
        })
      : await this.prisma.customer.create({
          data: { googleId: profile.sub, email, name: profile.name || email, emailVerifiedAt: new Date() }
        });
    return this.issueCustomerSession(customer);
  }

  private async issueVerificationEmail(customer: Customer) {
    const token = this.createToken();
    await this.prisma.emailVerificationToken.updateMany({
      where: { customerId: customer.id, usedAt: null },
      data: { usedAt: new Date() }
    });
    await this.prisma.emailVerificationToken.create({
      data: {
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + DAY_MS),
        customerId: customer.id
      }
    });
    await this.notifications.sendEmailVerification(customer.email, customer.name, token);
  }

  private async issueCustomerSession(customer: Customer) {
    const refreshToken = this.createToken();
    await this.prisma.refreshSession.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_DAYS * DAY_MS),
        customerId: customer.id
      }
    });
    return { session: await this.accessSession(customer), refreshToken };
  }

  private async accessSession(customer: Customer) {
    return {
      accessToken: await this.jwt.signAsync(
        { sub: customer.id, email: customer.email, kind: "customer" },
        { expiresIn: this.config.get<string>("CUSTOMER_ACCESS_TOKEN_EXPIRES_IN") ?? "15m" }
      ),
      customer: this.publicCustomer(customer)
    };
  }

  private publicCustomer(customer: Customer) {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      emailVerified: Boolean(customer.emailVerifiedAt)
    };
  }

  private createToken() {
    return randomBytes(32).toString("base64url");
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
