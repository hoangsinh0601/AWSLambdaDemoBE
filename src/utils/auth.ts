import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { AuthService } from "../services/AuthService";
import type { AuthTokenPayload } from "../models/User";
import { ForbiddenError, UnauthorizedError } from "./errors";

const authService = new AuthService();

export const getBearerToken = (event: APIGatewayProxyEventV2): string => {
  const header = event.headers?.authorization ?? event.headers?.Authorization;
  if (!header) {
    throw new UnauthorizedError("Authorization header is required");
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError("Authorization header must use Bearer token");
  }

  return token;
};

export const requireAuth = (event: APIGatewayProxyEventV2): AuthTokenPayload =>
  authService.verifyToken(getBearerToken(event));

export const requireAdmin = (event: APIGatewayProxyEventV2): AuthTokenPayload => {
  const user = requireAuth(event);
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Admin access is required");
  }
  return user;
};
