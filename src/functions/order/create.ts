import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { OrderService } from "../../services/OrderService";
import type { CreateOrderRequest, OrderItem } from "../../models/Order";
import { logger } from "../../utils/logger";
import { responseBuilder } from "../../utils/responseBuilder";

const orderService = new OrderService();
const isOffline = process.env.IS_OFFLINE === "true";

const isValidOrderItem = (item: unknown): item is OrderItem => {
  if (!item || typeof item !== "object") {
    return false;
  }

  const candidate = item as Partial<OrderItem>;
  return typeof candidate.name === "string" && typeof candidate.quantity === "number" && candidate.quantity > 0;
};

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const payload = (event.body ? JSON.parse(event.body) : {}) as Partial<CreateOrderRequest>;
    const items = Array.isArray(payload.items) ? payload.items.filter(isValidOrderItem) : [];

    if (items.length === 0) {
      return responseBuilder(400, { message: "items is required" });
    }

    const order = await orderService.createOrder({ items }, isOffline);

    return responseBuilder(200, {
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    logger.error("Failed to create order", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return responseBuilder(500, {
      message: "Internal server error",
    });
  }
};
