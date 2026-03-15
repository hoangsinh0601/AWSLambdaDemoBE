import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDbDocumentClient } from "../libs/dynamodb";
import type { InventoryItem } from "../models/Inventory";

export class InventoryRepository {
  private readonly tableName = process.env.INVENTORY_TABLE_NAME;

  async getByMenuItemId(menuItemId: string): Promise<InventoryItem | null> {
    const result = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { menuItemId },
      })
    );

    return (result.Item as InventoryItem) ?? null;
  }

  async list(): Promise<InventoryItem[]> {
    const result = await dynamoDbDocumentClient.send(
      new ScanCommand({
        TableName: this.tableName,
      })
    );

    return (result.Items ?? []) as InventoryItem[];
  }

  async create(item: InventoryItem): Promise<void> {
    await dynamoDbDocumentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );
  }

  async update(menuItemId: string, fields: Partial<Pick<InventoryItem, "currentStock" | "dailyLimit" | "dailySold" | "lastResetDate" | "updatedAt">>): Promise<void> {
    const updateParts: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        updateParts.push(`${attributeName} = ${attributeValue}`);
        names[attributeName] = key;
        values[attributeValue] = value;
      }
    });

    if (updateParts.length === 0) {
      return;
    }

    await dynamoDbDocumentClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { menuItemId },
        UpdateExpression: `SET ${updateParts.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: "attribute_exists(menuItemId)",
      })
    );
  }
}
