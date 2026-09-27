import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type OrderCreatedNotification = {
  orderNumber: string;
  email: string;
  customerName: string;
  subtotal: number;
};

type ServiceEnquiryNotification = {
  serviceTitle: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  message: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly config: ConfigService) {}

  async orderCreated(payload: OrderCreatedNotification) {
    this.logger.log(`Order notification queued for ${payload.orderNumber} (${payload.email})`);
  }

  async sendEmailVerification(email: string, name: string, token: string) {
    const url = `${this.frontendUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    await this.sendEmail(
      email,
      "Verify your ZD Crown email",
      `<h1>Verify your email</h1><p>Hello ${this.escapeHtml(name)},</p><p>Confirm your email to complete your ZD Crown buyer account.</p><p><a href="${url}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
      url
    );
  }

  async sendPasswordReset(email: string, name: string, token: string) {
    const url = `${this.frontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    await this.sendEmail(
      email,
      "Reset your ZD Crown password",
      `<h1>Reset your password</h1><p>Hello ${this.escapeHtml(name)},</p><p>Use the link below to choose a new password.</p><p><a href="${url}">Reset password</a></p><p>This link expires in one hour. Ignore this email if you did not request it.</p>`,
      url
    );
  }

  async sendServiceEnquiry(payload: ServiceEnquiryNotification) {
    const recipient = this.config.get<string>("ENQUIRY_NOTIFICATION_EMAIL") ?? this.config.get<string>("ADMIN_EMAIL");
    if (!recipient) {
      this.logger.warn("No enquiry notification recipient is configured");
      return;
    }

    await this.sendEmail(
      recipient,
      `New service enquiry: ${payload.serviceTitle}`,
      `<h1>New service enquiry</h1><p><strong>Service:</strong> ${this.escapeHtml(payload.serviceTitle)}</p><p><strong>Customer:</strong> ${this.escapeHtml(payload.customerName)} (${this.escapeHtml(payload.customerEmail)})</p><p><strong>Phone:</strong> ${this.escapeHtml(payload.phone)}</p><p><strong>Message:</strong></p><p>${this.escapeHtml(payload.message).replace(/\n/g, "<br>")}</p>`,
      `${this.frontendUrl()}/admin`
    );
  }

  private async sendEmail(to: string, subject: string, html: string, developmentUrl: string) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    if (!apiKey) {
      if (this.config.get<string>("NODE_ENV") !== "production") {
        this.logger.log(`${subject} development link: ${developmentUrl}`);
      } else {
        this.logger.warn(`RESEND_API_KEY is not configured; skipped email to ${to}`);
      }
      return;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: this.config.get<string>("EMAIL_FROM") ?? "ZD Crown <accounts@zdcrown.com>",
          to: [to],
          subject,
          html
        })
      });
      if (!response.ok) {
        this.logger.error(`Email provider rejected ${subject} for ${to} (${response.status})`);
      }
    } catch {
      this.logger.error(`Email provider could not be reached for ${subject} to ${to}`);
    }
  }

  private frontendUrl() {
    return (this.config.get<string>("FRONTEND_URL") ?? "http://localhost:3000").replace(/\/$/, "");
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
  }
}
