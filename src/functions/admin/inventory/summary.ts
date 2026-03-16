import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { InventoryService } from "../../../services/InventoryService";
import { requireAdmin } from "../../../utils/auth";
import { handleError, successResponse } from "../../../utils/responseBuilder";

const inventoryService = new InventoryService();

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    requireAdmin(event);
    const [stats, history] = await Promise.all([
      inventoryService.getSummaryStats(),
      inventoryService.listRecentHistory(20),
    ]);

    return successResponse(
      { stats, history },
      "Inventory summary retrieved successfully"
    );
  } catch (error) {
    return handleError(error);
  }
};
