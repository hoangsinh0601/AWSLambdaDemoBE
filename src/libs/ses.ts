import { SESClient } from "@aws-sdk/client-ses";

const region = process.env.AWS_REGION || "ap-southeast-1";

export const sesClient = new SESClient({ region });
