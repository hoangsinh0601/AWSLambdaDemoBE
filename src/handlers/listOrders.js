import {
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoClient, corsHeaders } from "../lib/aws.js";

const docClient = DynamoDBDocumentClient.from(dynamoClient);

const IS_OFFLINE = process.env.IS_OFFLINE === "true";

export const handler = async (event) => {
  console.log("listOrders event:", JSON.stringify(event, null, 2));

  try {
    if (IS_OFFLINE) {
      console.log("[OFFLINE] Skipping DynamoDB read.");
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Orders retrieved successfully",
          data: [],
        }),
      };
    }

    const params = {
      TableName: process.env.ORDERS_TABLE_NAME,
    };

    const result = await docClient.send(new ScanCommand(params));

    // Sort orders by timestamp if available (newest first)
    // Sort orders by timestamp if available (newest first)
    let items = result.Items || [];
    items.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    // Parse the JSON string stored in the items field back to an array
    items = items.map((order) => {
      let parsedItems = [];
      try {
        if (typeof order.items === "string") {
          parsedItems = JSON.parse(order.items);
        } else {
          parsedItems = order.items;
        }
      } catch (e) {
        console.error("Failed to parse items for order", order.orderId);
      }
      return {
        ...order,
        items: parsedItems,
      };
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Orders retrieved successfully",
        data: items,
      }),
    };
  } catch (error) {
    console.error("Error in listOrders:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Internal server error while fetching orders",
        error: error.message,
      }),
    };
  }
};
