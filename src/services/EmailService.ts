import { SendEmailCommand } from "@aws-sdk/client-ses";
import { sesClient } from "../libs/ses";
import { logger } from "../utils/logger";
import type { OrderStatus } from "../models/Order";

const ORDER_STATUS_EMAIL_COPY: Record<OrderStatus, { subject: string; body: string }> = {
  PENDING: {
    subject: "da duoc tao thanh cong",
    body: "da duoc tao thanh cong va dang cho nha hang xac nhan.",
  },
  CONFIRMED: {
    subject: "da duoc xac nhan",
    body: "da duoc nha hang xac nhan va dang duoc xu ly.",
  },
  PREPARING: {
    subject: "dang duoc chuan bi",
    body: "dang duoc bep chuan bi.",
  },
  READY: {
    subject: "da san sang",
    body: "da san sang de giao hoac nhan tai quan.",
  },
  COMPLETED: {
    subject: "da hoan thanh",
    body: "da duoc hoan thanh. Cam on ban da dat mon!",
  },
  CANCELLED: {
    subject: "da bi tu choi",
    body: "da bi tu choi boi nha hang. Vui long lien he nha hang neu can them ho tro.",
  },
};

export class EmailService {
  private readonly sourceEmail = process.env.EMAIL_SOURCE;

  async sendOrderStatusEmail(
    toAddress: string,
    customerName: string,
    orderId: string,
    status: OrderStatus
  ): Promise<void> {
    if (!this.sourceEmail) {
      logger.info("EMAIL_SOURCE is not configured, skipping email delivery", { toAddress, orderId, status });
      return;
    }

    const emailCopy = ORDER_STATUS_EMAIL_COPY[status];

    await sesClient.send(
      new SendEmailCommand({
        Source: this.sourceEmail,
        Destination: {
          ToAddresses: [toAddress],
        },
        Message: {
          Subject: {
            Data: `Don hang ${orderId.slice(0, 8)} ${emailCopy.subject}`,
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Data: `Xin chao ${customerName},\n\nDon hang ${orderId} cua ban ${emailCopy.body}\n\nTrang thai hien tai: ${status}\n\nCam on ban da su dung dich vu cua nha hang!`,
              Charset: "UTF-8",
            },
          },
        },
      })
    );
  }
}
