import { SNSClient } from "@aws-sdk/client-sns";

const region = process.env.AWS_REGION || "ap-southeast-1";

export const snsClient = new SNSClient({ region });
