import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { MenuService, type UpdateMenuItemRequest } from "../../../services/MenuService";
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

  logger.info("Received admin updateMenu request", { requestId, menuItemId });

  try {
    requireAdmin(event);
    const body = (event.body ? JSON.parse(event.body) : {}) as UpdateMenuItemRequest;
    const item = await menuService.updateMenuItem(menuItemId, body);
    return successResponse(item, "Menu item updated successfully");
  } catch (error) {
    logger.error("Failed to update menu item", { requestId, menuItemId, error: error instanceof Error ? error.message : "Unknown" });
    return handleError(error);
  }
};
