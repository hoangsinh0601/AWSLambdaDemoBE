import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { PublishCommand } from '@aws-sdk/client-sns';
import { v4 as uuidv4 } from 'uuid';
import { dynamoClient, snsClient, corsHeaders } from '../lib/aws.js';

const ORDERS_TABLE_NAME = process.env.ORDERS_TABLE_NAME;
const NEW_ORDER_TOPIC_ARN = process.env.NEW_ORDER_TOPIC_ARN;
const IS_OFFLINE = process.env.IS_OFFLINE === 'true';

const buildResponse = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  try {
    const payload = event?.body ? JSON.parse(event.body) : {};
    const items = Array.isArray(payload?.items) ? payload.items : [];

    if (items.length === 0) {
      return buildResponse(400, { message: 'items is required' });
    }

    const orderId = uuidv4();
    const createdAt = new Date().toISOString();
    const order = {
      orderId,
      status: 'PENDING',
      createdAt,
      items,
    };

    if (IS_OFFLINE) {
      console.log('[OFFLINE] Skipping DynamoDB write. Order:', JSON.stringify(order));
      console.log('[OFFLINE] Skipping SNS publish.');
    } else {
      await dynamoClient.send(
        new PutItemCommand({
          TableName: ORDERS_TABLE_NAME,
          Item: {
            orderId: { S: orderId },
            status: { S: order.status },
            createdAt: { S: createdAt },
            items: { S: JSON.stringify(items) },
          },
        })
      );

      await snsClient.send(
        new PublishCommand({
          TopicArn: NEW_ORDER_TOPIC_ARN,
          Subject: 'New F&B Order',
          Message: JSON.stringify(order),
        })
      );
    }

    return buildResponse(200, {
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    console.error('Failed to create order', error);

    return buildResponse(500, {
      message: 'Internal server error',
    });
  }
};
