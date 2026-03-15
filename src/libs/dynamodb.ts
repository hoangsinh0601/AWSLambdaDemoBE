import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "ap-southeast-1";

export const dynamoDbClient = new DynamoDBClient({ region });
export const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);
