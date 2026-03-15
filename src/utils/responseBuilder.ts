import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { AppError } from "./errors";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PATCH,DELETE",
  "Content-Type": "application/json",
} as const;

interface SuccessBody {
  success: true;
  data: unknown;
  message?: string;
}

interface ErrorBody {
  success: false;
  error: string;
  message: string;
}

const buildResponse = (statusCode: number, body: SuccessBody | ErrorBody): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

export const successResponse = (data: unknown, message?: string, statusCode = 200): APIGatewayProxyStructuredResultV2 =>
  buildResponse(statusCode, { success: true, data, ...(message ? { message } : {}) });

export const errorResponse = (statusCode: number, message: string, errorCode = "INTERNAL_ERROR"): APIGatewayProxyStructuredResultV2 =>
  buildResponse(statusCode, { success: false, error: errorCode, message });

export const handleError = (error: unknown): APIGatewayProxyStructuredResultV2 => {
  if (error instanceof AppError) {
    return errorResponse(error.statusCode, error.message, error.code);
  }
  return errorResponse(500, "Internal server error");
};

/** @deprecated Use successResponse/errorResponse instead */
export const responseBuilder = (
  statusCode: number,
  body: Record<string, unknown>
): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});
