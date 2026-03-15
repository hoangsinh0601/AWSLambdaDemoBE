import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { MenuService, type CreateMenuItemRequest } from "../../../services/MenuService";
import { logger } from "../../../utils/logger";
import { successResponse, handleError, errorResponse } from "../../../utils/responseBuilder";
import { requireAdmin } from "../../../utils/auth";

const menuService = new MenuService();

export const handler = async (event: APIGatewayProxyEventV2) => {
  const requestId = event.requestContext?.requestId;
  logger.info("Received admin createMenu request", { requestId });

  try {
    requireAdmin(event);
    const body = (event.body ? JSON.parse(event.body) : {}) as Partial<CreateMenuItemRequest>;

    if (!body.name) {
      return errorResponse(400, "name is required", "VALIDATION_ERROR");
    }
    if (typeof body.price !== "number") {
      return errorResponse(400, "price is required and must be a number", "VALIDATION_ERROR");
    }
    if (!body.category) {
      return errorResponse(400, "category is required", "VALIDATION_ERROR");
    }

    const item = await menuService.createMenuItem(body as CreateMenuItemRequest);
    return successResponse(item, "Menu item created successfully", 201);
  } catch (error) {
    logger.error("Failed to create menu item", { requestId, error: error instanceof Error ? error.message : "Unknown" });
    return handleError(error);
  }
};
