import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { OrderService } from "../../services/OrderService";
import { logger } from "../../utils/logger";
import { responseBuilder } from "../../utils/responseBuilder";

const orderService = new OrderService();
const isOffline = process.env.IS_OFFLINE === "true";

export const handler = async (event: APIGatewayProxyEventV2) => {
  logger.info("Received listOrders request", {
    routeKey: event.routeKey,
  });

  try {
    const data = await orderService.listOrders(isOffline);

    return responseBuilder(200, {
      message: "Orders retrieved successfully",
      data,
    });
  } catch (error) {
    logger.error("Failed to list orders", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return responseBuilder(500, {
      message: "Internal server error while fetching orders",
    });
  }
};
