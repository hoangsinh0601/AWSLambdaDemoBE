import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { MenuService } from "../../services/MenuService";
import { logger } from "../../utils/logger";
import { successResponse, handleError } from "../../utils/responseBuilder";

const menuService = new MenuService();

export const handler = async (event: APIGatewayProxyEventV2) => {
  const requestId = event.requestContext?.requestId;
  logger.info("Received seedMenu request", { requestId });

  try {
    const items = await menuService.seedMenu();
    return successResponse(items, "Menu seeded successfully");
  } catch (error) {
    logger.error("Failed to seed menu", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return handleError(error);
  }
};
