import type { SQSHandler } from "aws-lambda";
import { logger } from "../../utils/logger";

type QueueOrderMessage = {
  orderId?: string;
  status?: string;
  items?: unknown[];
};

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records ?? []) {
    try {
      const message = JSON.parse(record.body) as QueueOrderMessage;

      logger.info("Simulating inventory deduction", {
        orderId: message.orderId,
        status: message.status,
        items: message.items,
      });
    } catch (error) {
      logger.error("Failed to process queue message", {
        body: record.body,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
};
