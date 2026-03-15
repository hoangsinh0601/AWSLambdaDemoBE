import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { AuthService } from "../../services/AuthService";
import { handleError, successResponse, errorResponse } from "../../utils/responseBuilder";

const authService = new AuthService();

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    if (!body.email || !body.password) {
      return errorResponse(400, "email and password are required", "VALIDATION_ERROR");
    }

    const result = await authService.login(body);
    return successResponse(result, "Login successful");
  } catch (error) {
    return handleError(error);
  }
};
