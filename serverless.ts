import { createOrder, listOrders, getOrder, updateOrderStatus } from "./src/functions/order";
import { listMenu, seedMenu } from "./src/functions/menu";
import { adminListMenu, adminCreateMenu, adminUpdateMenu, adminDeleteMenu } from "./src/functions/admin/menu";
import { adminListInventory, adminUpdateInventory, adminGetInventorySummary } from "./src/functions/admin/inventory";
import { processQueue } from "./src/functions/inventory";
import { loginUser, registerUser, getProfile } from "./src/functions/auth";

const serverlessConfiguration = {
  service: "restaurant-serverless-api",
  frameworkVersion: "3",
  useDotenv: true,
  plugins: ["serverless-esbuild", "serverless-offline"],
  custom: {
    stage: "${opt:stage, 'dev'}",
    esbuild: {
      bundle: true,
      minify: false,
      config: "./esbuild.config.js",
      outputFileExtension: ".js",
      exclude: ["aws-sdk"],
    },
    "serverless-offline": {
      httpPort: 3001,
      noPrependStageInUrl: true,
    },
  },
  provider: {
    name: "aws",
    runtime: "nodejs20.x",
    region: "ap-southeast-1",
    stage: "${self:custom.stage}",
    environment: {
      ORDERS_TABLE_NAME: { Ref: "OrdersTable" },
      MENU_TABLE_NAME: { Ref: "MenuItemsTable" },
      INVENTORY_TABLE_NAME: { Ref: "InventoryTable" },
      INVENTORY_HISTORY_TABLE_NAME: { Ref: "InventoryHistoryTable" },
      USERS_TABLE_NAME: { Ref: "UsersTable" },
      NEW_ORDER_TOPIC_ARN: { Ref: "NewOrderTopic" },
      INVENTORY_QUEUE_URL: { Ref: "InventoryQueue" },
      STAGE: "${self:custom.stage}",
      JWT_SECRET: "${env:JWT_SECRET, 'dev-jwt-secret'}",
      EMAIL_SOURCE: "${env:EMAIL_SOURCE, ''}",
      ADMIN_EMAILS: "${env:ADMIN_EMAILS, ''}",
      DEFAULT_ADMIN_EMAIL: "${env:DEFAULT_ADMIN_EMAIL, 'admin@demo.local'}",
      DEFAULT_ADMIN_PASSWORD: "${env:DEFAULT_ADMIN_PASSWORD, 'Admin@123456'}",
      DEFAULT_ADMIN_NAME: "${env:DEFAULT_ADMIN_NAME, 'Default Admin'}",
    },
    httpApi: {
      cors: {
        allowedOrigins: ["*"],
        allowedHeaders: ["Content-Type", "Authorization"],
        allowedMethods: ["OPTIONS", "POST", "GET", "PATCH", "DELETE"],
      },
    },
    iam: {
      role: {
        statements: [
          {
            Effect: "Allow",
            Action: ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan"],
            Resource: [
              { "Fn::GetAtt": ["OrdersTable", "Arn"] },
              { "Fn::GetAtt": ["MenuItemsTable", "Arn"] },
              { "Fn::GetAtt": ["InventoryTable", "Arn"] },
              { "Fn::GetAtt": ["InventoryHistoryTable", "Arn"] },
              { "Fn::GetAtt": ["UsersTable", "Arn"] },
            ],
          },
          {
            Effect: "Allow",
            Action: ["dynamodb:BatchWriteItem"],
            Resource: [{ "Fn::GetAtt": ["MenuItemsTable", "Arn"] }],
          },
          {
            Effect: "Allow",
            Action: ["sns:Publish"],
            Resource: [{ Ref: "NewOrderTopic" }],
          },
          {
            Effect: "Allow",
            Action: ["ses:SendEmail", "ses:SendRawEmail"],
            Resource: ["*"],
          },
          {
            Effect: "Allow",
            Action: ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
            Resource: [{ "Fn::GetAtt": ["InventoryQueue", "Arn"] }],
          },
        ],
      },
    },
  },
  functions: {
    registerUser,
    loginUser,
    getProfile,
    createOrder,
    listOrders,
    getOrder,
    updateOrderStatus,
    listMenu,
    seedMenu,
    adminListMenu,
    adminCreateMenu,
    adminUpdateMenu,
    adminDeleteMenu,
    adminListInventory,
    adminUpdateInventory,
    adminGetInventorySummary,
    processQueue,
  },
  resources: {
    Resources: {
      OrdersTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [{ AttributeName: "orderId", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "orderId", KeyType: "HASH" }],
        },
      },
      MenuItemsTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [{ AttributeName: "menuItemId", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "menuItemId", KeyType: "HASH" }],
        },
      },
      InventoryTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [{ AttributeName: "menuItemId", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "menuItemId", KeyType: "HASH" }],
        },
      },
      InventoryHistoryTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [{ AttributeName: "historyId", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "historyId", KeyType: "HASH" }],
        },
      },
      UsersTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [{ AttributeName: "userId", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
        },
      },
      NewOrderTopic: {
        Type: "AWS::SNS::Topic",
        Properties: {},
      },
      InventoryQueue: {
        Type: "AWS::SQS::Queue",
        Properties: {},
      },
      InventoryQueuePolicy: {
        Type: "AWS::SQS::QueuePolicy",
        Properties: {
          Queues: [{ Ref: "InventoryQueue" }],
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: "*",
                Action: "sqs:SendMessage",
                Resource: { "Fn::GetAtt": ["InventoryQueue", "Arn"] },
                Condition: {
                  ArnEquals: {
                    "aws:SourceArn": { Ref: "NewOrderTopic" },
                  },
                },
              },
            ],
          },
        },
      },
      InventoryQueueSubscription: {
        Type: "AWS::SNS::Subscription",
        Properties: {
          TopicArn: { Ref: "NewOrderTopic" },
          Protocol: "sqs",
          Endpoint: { "Fn::GetAtt": ["InventoryQueue", "Arn"] },
          RawMessageDelivery: true,
        },
      },
      EmailNotificationSubscription: {
        Type: "AWS::SNS::Subscription",
        Properties: {
          TopicArn: { Ref: "NewOrderTopic" },
          Protocol: "email",
          Endpoint: "phamngohoangsinh@gmail.com",
        },
      },
    },
    Outputs: {
      ApiUrl: {
        Description: "HTTP API URL",
        Value: {
          "Fn::Join": ["", ["https://", { Ref: "HttpApi" }, ".execute-api.", { Ref: "AWS::Region" }, ".amazonaws.com"]],
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
