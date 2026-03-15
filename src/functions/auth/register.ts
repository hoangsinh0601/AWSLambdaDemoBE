import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { AuthService } from "../../services/AuthService";
import { handleError, successResponse, errorResponse } from "../../utils/responseBuilder";

const authService = new AuthService();

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    if (!body.email || !body.password || !body.name) {
      return errorResponse(400, "email, password and name are required", "VALIDATION_ERROR");
    }

    const result = await authService.register(body);
    return successResponse(result, "Registration successful", 201);
  } catch (error) {
    return handleError(error);
  }
};
