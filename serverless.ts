import { createOrder, listOrders } from "./src/functions/order";
import { processQueue } from "./src/functions/inventory";

const serverlessConfiguration = {
  service: "restaurant-serverless-api",
  frameworkVersion: "3",
  useDotenv: true,
  plugins: ["serverless-esbuild", "serverless-offline"],
  custom: {
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
    stage: "${opt:stage, 'dev'}",
    environment: {
      ORDERS_TABLE_NAME: { Ref: "OrdersTable" },
      NEW_ORDER_TOPIC_ARN: { Ref: "NewOrderTopic" },
      INVENTORY_QUEUE_URL: { Ref: "InventoryQueue" },
    },
    httpApi: {
      cors: {
        allowedOrigins: ["*"],
        allowedHeaders: ["Content-Type", "Authorization"],
        allowedMethods: ["OPTIONS", "POST", "GET"],
      },
    },
    iamRoleStatements: [
      {
        Effect: "Allow",
        Action: ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:Scan"],
        Resource: [{ "Fn::GetAtt": ["OrdersTable", "Arn"] }],
      },
      {
        Effect: "Allow",
        Action: ["sns:Publish"],
        Resource: [{ Ref: "NewOrderTopic" }],
      },
      {
        Effect: "Allow",
        Action: ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
        Resource: [{ "Fn::GetAtt": ["InventoryQueue", "Arn"] }],
      },
    ],
  },
  functions: {
    createOrder,
    listOrders,
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
  },
};

module.exports = serverlessConfiguration;
