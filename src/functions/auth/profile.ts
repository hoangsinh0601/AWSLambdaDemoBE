import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { AuthService } from "../../services/AuthService";
import { requireAuth } from "../../utils/auth";
import { handleError, successResponse } from "../../utils/responseBuilder";

const authService = new AuthService();

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const user = requireAuth(event);
    const profile = await authService.getUserById(user.sub);
    return successResponse(profile, "Profile fetched successfully");
  } catch (error) {
    return handleError(error);
  }
};
