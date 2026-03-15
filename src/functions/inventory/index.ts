const basePath = "src/functions/inventory";

export const processQueue = {
  handler: `${basePath}/processQueue.handler`,
  events: [
    {
      sqs: {
        arn: {
          "Fn::GetAtt": ["InventoryQueue", "Arn"],
        },
        batchSize: 10,
      },
    },
  ],
};
