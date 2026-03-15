import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { OrderService } from "../../services/OrderService";
import type { OrderStatus } from "../../models/Order";
import { logger } from "../../utils/logger";
import { successResponse, handleError, errorResponse } from "../../utils/responseBuilder";
import { requireAdmin } from "../../utils/auth";

const orderService = new OrderService();
const isOffline = process.env.IS_OFFLINE === "true";

interface UpdateStatusBody {
  status?: OrderStatus;
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  const requestId = event.requestContext?.requestId;
  const orderId = event.pathParameters?.id;

  if (!orderId) {
    return errorResponse(400, "Order ID is required", "VALIDATION_ERROR");
  }

  logger.info("Received updateOrderStatus request", { requestId, orderId });

  try {
    requireAdmin(event);
    const body = (event.body ? JSON.parse(event.body) : {}) as UpdateStatusBody;

    if (!body.status) {
      return errorResponse(400, "status is required in request body", "VALIDATION_ERROR");
    }

    const order = await orderService.updateOrderStatus(orderId, body.status, isOffline);
    return successResponse(order, "Order status updated successfully");
  } catch (error) {
    logger.error("Failed to update order status", {
      requestId,
      orderId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return handleError(error);
  }
};
