import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";

type CustomerJwtPayload = {
  sub: string;
  email: string;
  kind: "customer";
};

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, "customer-jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET")
    });
  }

  async validate(payload: CustomerJwtPayload) {
    if (payload.kind !== "customer") throw new UnauthorizedException("Customer login required");
    const customer = await this.prisma.customer.findUnique({ where: { id: payload.sub } });
    if (!customer) throw new UnauthorizedException("Customer account no longer exists");
    return { id: customer.id, name: customer.name, email: customer.email, emailVerified: Boolean(customer.emailVerifiedAt) };
  }
}
