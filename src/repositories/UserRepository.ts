import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDbDocumentClient } from "../libs/dynamodb";
import type { User } from "../models/User";

export class UserRepository {
  private readonly tableName = process.env.USERS_TABLE_NAME;

  async create(user: User): Promise<void> {
    await dynamoDbDocumentClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: user,
        ConditionExpression: "attribute_not_exists(userId)",
      })
    );
  }

  async getById(userId: string): Promise<User | null> {
    const result = await dynamoDbDocumentClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { userId },
      })
    );

    return (result.Item as User) ?? null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const result = await dynamoDbDocumentClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": email,
        },
      })
    );

    const [user] = (result.Items ?? []) as User[];
    return user ?? null;
  }
}
