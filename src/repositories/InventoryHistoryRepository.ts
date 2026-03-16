import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDbDocumentClient } from "../libs/dynamodb";
import type { InventoryHistoryItem } from "../models/InventoryHistory";

export class InventoryHistoryRepository {
  private readonly tableName = process.env.INVENTORY_HISTORY_TABLE_NAME;

  async create(item: InventoryHistoryItem): Promise<void> {
    await dynamoDbDocumentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );
  }

  async listRecent(limit = 50): Promise<InventoryHistoryItem[]> {
    const result = await dynamoDbDocumentClient.send(
      new ScanCommand({
        TableName: this.tableName,
      })
    );

    return ((result.Items ?? []) as InventoryHistoryItem[])
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, limit);
  }
}
