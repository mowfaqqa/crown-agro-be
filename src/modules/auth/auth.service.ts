import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

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
        { sub: admin.id, email: admin.email, role: admin.role },
        { expiresIn: this.config.get<string>("JWT_EXPIRES_IN") ?? "1d" }
      )
    };
  }
}
