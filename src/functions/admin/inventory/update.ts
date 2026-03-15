import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { InventoryService } from "../../../services/InventoryService";
import { requireAdmin } from "../../../utils/auth";
import { errorResponse, handleError, successResponse } from "../../../utils/responseBuilder";

const inventoryService = new InventoryService();

export const handler = async (event: APIGatewayProxyEventV2) => {
  const menuItemId = event.pathParameters?.id;

  if (!menuItemId) {
    return errorResponse(400, "Menu item ID is required", "VALIDATION_ERROR");
  }

  try {
    requireAdmin(event);
    const body = event.body ? JSON.parse(event.body) : {};
    const result = await inventoryService.updateInventory(menuItemId, {
      currentStock: body.currentStock,
      dailyLimit: body.dailyLimit,
    });
    return successResponse(result, "Inventory updated successfully");
  } catch (error) {
    return handleError(error);
  }
};
