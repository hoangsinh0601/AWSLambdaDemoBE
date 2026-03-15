import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { OrderService } from "../../services/OrderService";
import type { CreateOrderRequest, OrderItem } from "../../models/Order";
import { logger } from "../../utils/logger";
import { successResponse, handleError, errorResponse } from "../../utils/responseBuilder";
import { requireAuth } from "../../utils/auth";

const orderService = new OrderService();
const isOffline = process.env.IS_OFFLINE === "true";

const isValidOrderItem = (item: unknown): item is OrderItem => {
  if (!item || typeof item !== "object") {
    return false;
  }

  const candidate = item as Partial<OrderItem>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.quantity === "number" &&
    candidate.quantity > 0 &&
    typeof candidate.price === "number" &&
    candidate.price >= 0
  );
};

export const handler = async (event: APIGatewayProxyEventV2) => {
  const requestId = event.requestContext?.requestId;
  logger.info("Received createOrder request", { requestId });

  try {
    const user = requireAuth(event);
    const payload = (event.body ? JSON.parse(event.body) : {}) as Partial<CreateOrderRequest>;
    const items = Array.isArray(payload.items) ? payload.items.filter(isValidOrderItem) : [];

    if (items.length === 0) {
      return errorResponse(400, "items is required and each item must have name, quantity (>0), and price (>=0)", "VALIDATION_ERROR");
    }

    const order = await orderService.createOrder(
      {
        items,
        notes: payload.notes,
        userId: user.sub,
        userEmail: user.email,
        customerName: user.name,
      },
      isOffline
    );

    return successResponse(order, "Order created successfully", 201);
  } catch (error) {
    logger.error("Failed to create order", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return handleError(error);
  }
};
