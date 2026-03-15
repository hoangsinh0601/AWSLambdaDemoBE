import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { InventoryService } from "../../../services/InventoryService";
import { requireAdmin } from "../../../utils/auth";
import { handleError, successResponse } from "../../../utils/responseBuilder";

const inventoryService = new InventoryService();

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    requireAdmin(event);
    const items = await inventoryService.listWithMenu();
    return successResponse(items, "Inventory retrieved successfully");
  } catch (error) {
    return handleError(error);
  }
};
