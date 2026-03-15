import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
  "Content-Type": "application/json",
} as const;

export const responseBuilder = (
  statusCode: number,
  body: Record<string, unknown>
): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});
