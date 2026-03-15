import type { SQSHandler } from "aws-lambda";
import { InventoryService } from "../../services/InventoryService";
import { OrderRepository } from "../../repositories/OrderRepository";
import { OrderService } from "../../services/OrderService";
import { logger } from "../../utils/logger";
import type { OrderCreatedEvent, OrderEvent, OrderStatusUpdatedEvent } from "../../models/Event";

const inventoryService = new InventoryService();
const orderRepository = new OrderRepository();
const orderService = new OrderService();

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records ?? []) {
    try {
      const message = JSON.parse(record.body) as OrderEvent;

      if (message.eventType === "OrderCreated") {
        const createdEvent = message as OrderCreatedEvent;
        logger.info("Received OrderCreated event for inventory workflow", {
          orderId: createdEvent.orderId,
          status: createdEvent.status,
        });
        continue;
      }

      if (message.eventType === "OrderStatusUpdated") {
        const statusEvent = message as OrderStatusUpdatedEvent;

        if (statusEvent.newStatus !== "CONFIRMED") {
          logger.info("Skipping inventory deduction for non-confirmed status", {
            orderId: statusEvent.orderId,
            status: statusEvent.newStatus,
          });
          continue;
        }

        const order = await orderRepository.getById(statusEvent.orderId);
        if (!order) {
          throw new Error(`Order ${statusEvent.orderId} not found for inventory deduction`);
        }

        const parsedItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
        try {
          await inventoryService.adjustInventoryForConfirmedOrder(parsedItems);
        } catch (inventoryError) {
          logger.error("Inventory deduction failed after order confirmation, cancelling order", {
            orderId: statusEvent.orderId,
            error: inventoryError instanceof Error ? inventoryError.message : "Unknown error",
          });

          await orderService.updateOrderStatus(statusEvent.orderId, "CANCELLED", false);
          continue;
        }

        logger.info("Inventory deducted successfully", {
          orderId: statusEvent.orderId,
          items: parsedItems,
        });
      }
    } catch (error) {
      logger.error("Failed to process queue message", {
        body: record.body,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
};
