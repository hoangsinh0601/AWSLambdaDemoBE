import { PutCommand, ScanCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDbDocumentClient } from "../libs/dynamodb";
import type { Order, OrderStatus, StoredOrder } from "../models/Order";

export class OrderRepository {
  private readonly tableName = process.env.ORDERS_TABLE_NAME;

  async create(order: Order): Promise<void> {
    await dynamoDbDocumentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          ...order,
          items: JSON.stringify(order.items),
        },
      })
    );
  }

  async getById(orderId: string): Promise<StoredOrder | null> {
    const result = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { orderId },
      })
    );
    return (result.Item as StoredOrder) ?? null;
  }

  async updateStatus(orderId: string, status: OrderStatus, updatedAt: string): Promise<void> {
    await dynamoDbDocumentClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { orderId },
        UpdateExpression: "SET #status = :status, #updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#status": "status",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":status": status,
          ":updatedAt": updatedAt,
        },
        ConditionExpression: "attribute_exists(orderId)",
      })
    );
  }

  async list(): Promise<StoredOrder[]> {
    const result = await dynamoDbDocumentClient.send(
      new ScanCommand({ TableName: this.tableName })
    );
    return (result.Items ?? []) as StoredOrder[];
  }

  async listByUserId(userId: string): Promise<StoredOrder[]> {
    const result = await dynamoDbDocumentClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
    );

    return (result.Items ?? []) as StoredOrder[];
  }
}
