import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!admin) throw new UnauthorizedException("Invalid credentials");

    const matches = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!matches) throw new UnauthorizedException("Invalid credentials");

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
    return this.customerSession(customer);
  }

  async loginCustomer(dto: LoginDto) {
    const customer = await this.prisma.customer.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!customer || !(await bcrypt.compare(dto.password, customer.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.customerSession(customer);
  }

  private async customerSession(customer: { id: string; name: string; email: string }) {
    return {
      accessToken: await this.jwt.signAsync(
        { sub: customer.id, email: customer.email, kind: "customer" },
        { expiresIn: this.config.get<string>("JWT_EXPIRES_IN") ?? "1d" }
      ),
      customer: { id: customer.id, name: customer.name, email: customer.email }
    };
  }
}
