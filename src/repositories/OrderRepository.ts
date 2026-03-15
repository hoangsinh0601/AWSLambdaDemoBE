import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDbDocumentClient } from "../libs/dynamodb";
import type { Order, StoredOrder } from "../models/Order";

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

  async list(): Promise<StoredOrder[]> {
    const result = await dynamoDbDocumentClient.send(
      new ScanCommand({
        TableName: this.tableName,
      })
    );

    return (result.Items ?? []) as StoredOrder[];
  }
}
