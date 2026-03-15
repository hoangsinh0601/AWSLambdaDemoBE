import { PutCommand, ScanCommand, GetCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDbDocumentClient } from "../libs/dynamodb";
import type { MenuItem } from "../models/MenuItem";

export class MenuRepository {
  private readonly tableName = process.env.MENU_TABLE_NAME;

  async list(): Promise<MenuItem[]> {
    const result = await dynamoDbDocumentClient.send(
      new ScanCommand({ TableName: this.tableName })
    );
    return (result.Items ?? []) as MenuItem[];
  }

  async getById(menuItemId: string): Promise<MenuItem | null> {
    const result = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { menuItemId },
      })
    );
    return (result.Item as MenuItem) ?? null;
  }

  async create(item: MenuItem): Promise<void> {
    await dynamoDbDocumentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(menuItemId)",
      })
    );
  }

  async update(menuItemId: string, fields: Partial<Omit<MenuItem, "menuItemId" | "createdAt">>): Promise<void> {
    const updateParts: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        const attrName = `#${key}`;
        const attrValue = `:${key}`;
        updateParts.push(`${attrName} = ${attrValue}`);
        names[attrName] = key;
        values[attrValue] = value;
      }
    });

    if (updateParts.length === 0) return;

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

  async delete(menuItemId: string): Promise<void> {
    await dynamoDbDocumentClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { menuItemId },
        ConditionExpression: "attribute_exists(menuItemId)",
      })
    );
  }

  async batchCreate(items: MenuItem[]): Promise<void> {
    const BATCH_LIMIT = 25;
    for (let i = 0; i < items.length; i += BATCH_LIMIT) {
      const batch = items.slice(i, i + BATCH_LIMIT);
      await dynamoDbDocumentClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName!]: batch.map((item) => ({
              PutRequest: { Item: item },
            })),
          },
        })
      );
    }
  }
}
