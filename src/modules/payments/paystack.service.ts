import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrderStatus } from "@prisma/client";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

type PaystackResponse<T> = { status: boolean; message: string; data: T };
type InitializedTransaction = { authorization_url: string; access_code: string; reference: string };
type VerifiedTransaction = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
};
type PaystackEvent = {
  event?: string;
  data?: Partial<VerifiedTransaction>;
};

@Injectable()
export class PaystackService {
  private readonly baseUrl = "https://api.paystack.co";

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async initialize(orderId: string, customer: { id: string; email: string; emailVerified: boolean }) {
    if (!customer.emailVerified) {
      throw new ForbiddenException("Verify your email before making a payment");
    }
    const order = await this.prisma.order.findFirst({ where: { id: orderId, customerId: customer.id } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status === OrderStatus.PAID || order.status === OrderStatus.FULFILLED) {
      throw new ConflictException("This order has already been paid");
    }
    if (order.status === OrderStatus.AWAITING_PAYMENT && order.paymentUrl && order.paymentReference) {
      return { authorizationUrl: order.paymentUrl, reference: order.paymentReference };
    }
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException("Payment becomes available after the order is confirmed");
    }

    const reference = `ZDC-${order.orderNumber.replace(/[^A-Za-z0-9]/g, "")}-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
    const frontendUrl = this.config.get<string>("FRONTEND_URL")?.replace(/\/$/, "") ?? "http://localhost:3000";
    const transaction = await this.request<InitializedTransaction>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: customer.email,
        amount: this.amountInKobo(order.subtotal),
        currency: "NGN",
        reference,
        callback_url: `${frontendUrl}/payments/paystack/callback?orderId=${encodeURIComponent(order.id)}`,
        metadata: { orderId: order.id, orderNumber: order.orderNumber, customerId: customer.id }
      })
    });

    const updated = await this.prisma.order.updateMany({
      where: { id: order.id, customerId: customer.id, status: OrderStatus.CONFIRMED, paymentReference: null },
      data: {
        status: OrderStatus.AWAITING_PAYMENT,
        paymentProvider: "PAYSTACK",
        paymentReference: reference,
        paymentUrl: transaction.authorization_url
      }
    });
    if (updated.count !== 1) {
      throw new ConflictException("Order payment state changed. Refresh and try again");
    }
    return { authorizationUrl: transaction.authorization_url, reference };
  }

  async verify(orderId: string, reference: string, customerId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, customerId } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.paymentReference !== reference || order.paymentProvider !== "PAYSTACK") {
      throw new BadRequestException("Payment reference does not match this order");
    }
    if (order.status === OrderStatus.PAID || order.status === OrderStatus.FULFILLED) {
      return this.paymentResult(order);
    }

    const transaction = await this.request<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
    this.assertSuccessfulPayment(transaction, order.subtotal, reference);
    const updated = await this.prisma.order.updateMany({
      where: { id: order.id, status: OrderStatus.AWAITING_PAYMENT, paymentReference: reference },
      data: { status: OrderStatus.PAID, paidAt: new Date() }
    });
    if (updated.count !== 1) {
      throw new ConflictException("Order payment state changed. Refresh and try again");
    }
    const paidOrder = await this.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    return this.paymentResult(paidOrder);
  }

  async processWebhook(rawBody?: Buffer, signature?: string) {
    if (!rawBody || !signature) throw new UnauthorizedException("Invalid Paystack signature");
    const secret = this.secret();
    const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
    const received = Buffer.from(signature, "utf8");
    const calculated = Buffer.from(expected, "utf8");
    if (received.length !== calculated.length || !timingSafeEqual(received, calculated)) {
      throw new UnauthorizedException("Invalid Paystack signature");
    }

    let payload: PaystackEvent;
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as PaystackEvent;
    } catch {
      throw new BadRequestException("Invalid webhook payload");
    }
    if (payload.event !== "charge.success" || !payload.data?.reference) return { received: true };

    const order = await this.prisma.order.findUnique({ where: { paymentReference: payload.data.reference } });
    if (!order || order.status === OrderStatus.PAID || order.status === OrderStatus.FULFILLED) {
      return { received: true };
    }
    this.assertSuccessfulPayment(payload.data as VerifiedTransaction, order.subtotal, order.paymentReference ?? "");
    await this.prisma.order.updateMany({
      where: { id: order.id, status: OrderStatus.AWAITING_PAYMENT, paymentReference: payload.data.reference },
      data: { status: OrderStatus.PAID, paidAt: new Date() }
    });
    return { received: true };
  }

  private assertSuccessfulPayment(transaction: VerifiedTransaction, subtotal: number, reference: string) {
    if (
      transaction.status !== "success" ||
      transaction.reference !== reference ||
      transaction.currency !== "NGN" ||
      transaction.amount !== this.amountInKobo(subtotal)
    ) {
      throw new BadRequestException("Payment could not be verified for this order");
    }
  }

  private amountInKobo(subtotal: number) {
    const amount = subtotal * 100;
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new BadRequestException("Order total is invalid");
    return amount;
  }

  private paymentResult(order: { id: string; orderNumber: string; status: OrderStatus; paidAt: Date | null }) {
    return { id: order.id, orderNumber: order.orderNumber, status: order.status, paidAt: order.paidAt };
  }

  private secret() {
    const value = this.config.get<string>("PAYSTACK_SECRET_KEY")?.trim();
    if (!value) throw new ServiceUnavailableException("Payments are not configured");
    return value;
  }

  private async request<T>(path: string, init: RequestInit = {}) {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: `Bearer ${this.secret()}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {})
        }
      });
    } catch {
      throw new ServiceUnavailableException("Payment provider is temporarily unavailable");
    }
    const body = await response.json().catch(() => null) as PaystackResponse<T> | null;
    if (!response.ok || !body?.status || !body.data) {
      throw new BadGatewayException(body?.message || "Payment provider rejected the request");
    }
    return body.data;
  }
}
