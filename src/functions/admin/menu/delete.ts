import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { MenuService } from "../../../services/MenuService";
import { logger } from "../../../utils/logger";
import { successResponse, handleError, errorResponse } from "../../../utils/responseBuilder";
import { requireAdmin } from "../../../utils/auth";

const menuService = new MenuService();

export const handler = async (event: APIGatewayProxyEventV2) => {
  const requestId = event.requestContext?.requestId;
  const menuItemId = event.pathParameters?.id;

  if (!menuItemId) {
    return errorResponse(400, "Menu item ID is required", "VALIDATION_ERROR");
  }

  logger.info("Received admin deleteMenu request", { requestId, menuItemId });

  try {
    requireAdmin(event);
    await menuService.deleteMenuItem(menuItemId);
    return successResponse(null, "Menu item deleted successfully");
  } catch (error) {
    logger.error("Failed to delete menu item", { requestId, menuItemId, error: error instanceof Error ? error.message : "Unknown" });
    return handleError(error);
  }
};
