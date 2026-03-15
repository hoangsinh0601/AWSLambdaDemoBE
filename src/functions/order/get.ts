import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { OrderService } from "../../services/OrderService";
import { logger } from "../../utils/logger";
import { successResponse, handleError, errorResponse } from "../../utils/responseBuilder";
import { requireAuth } from "../../utils/auth";

const orderService = new OrderService();
const isOffline = process.env.IS_OFFLINE === "true";

export const handler = async (event: APIGatewayProxyEventV2) => {
  const requestId = event.requestContext?.requestId;
  const orderId = event.pathParameters?.id;

  if (!orderId) {
    return errorResponse(400, "Order ID is required", "VALIDATION_ERROR");
  }

  logger.info("Received getOrder request", { requestId, orderId });

  try {
    const user = requireAuth(event);
    const order = await orderService.getOrder(orderId, isOffline, {
      userId: user.sub,
      role: user.role,
    });
    return successResponse(order, "Order retrieved successfully");
  } catch (error) {
    logger.error("Failed to get order", {
      requestId,
      orderId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return handleError(error);
  }
};
