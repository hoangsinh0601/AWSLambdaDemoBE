import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { MenuService } from "../../../services/MenuService";
import { logger } from "../../../utils/logger";
import { successResponse, handleError } from "../../../utils/responseBuilder";
import { requireAdmin } from "../../../utils/auth";

const menuService = new MenuService();

export const handler = async (event: APIGatewayProxyEventV2) => {
  const requestId = event.requestContext?.requestId;
  logger.info("Received admin listMenu request", { requestId });

  try {
    requireAdmin(event);
    const items = await menuService.listAll();
    return successResponse(items, "Menu retrieved successfully");
  } catch (error) {
    logger.error("Failed to list admin menu", { requestId, error: error instanceof Error ? error.message : "Unknown" });
    return handleError(error);
  }
};
