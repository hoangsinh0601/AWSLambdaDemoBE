import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';

const region = process.env.AWS_REGION || 'ap-southeast-1';

export const dynamoClient = new DynamoDBClient({ region });
export const snsClient = new SNSClient({ region });

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
  'Content-Type': 'application/json',
};
