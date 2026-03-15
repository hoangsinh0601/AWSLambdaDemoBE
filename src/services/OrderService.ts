import { PublishCommand } from "@aws-sdk/client-sns";
import { v4 as uuidv4 } from "uuid";
import { OrderRepository } from "../repositories/OrderRepository";
import { snsClient } from "../libs/sns";
import type { CreateOrderRequest, Order, OrderItem, StoredOrder } from "../models/Order";
import type { NewOrderEvent } from "../models/Event";
import { logger } from "../utils/logger";

export class OrderService {
  constructor(private readonly orderRepository = new OrderRepository()) {}

  async createOrder(payload: CreateOrderRequest, isOffline: boolean): Promise<Order> {
    const order: Order = {
      orderId: uuidv4(),
      status: "PENDING",
      createdAt: new Date().toISOString(),
      items: payload.items,
    };

    if (isOffline) {
      logger.info("Skipping external AWS calls in offline mode", { orderId: order.orderId });
      return order;
    }

    await this.orderRepository.create(order);

    const event: NewOrderEvent = {
      orderId: order.orderId,
      createdAt: order.createdAt,
      status: order.status,
      items: order.items,
    };

    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.NEW_ORDER_TOPIC_ARN,
        Subject: "New F&B Order",
        Message: JSON.stringify(event),
      })
    );

    return order;
  }

  async listOrders(isOffline: boolean): Promise<Array<Omit<Order, "items"> & { items: OrderItem[] }>> {
    if (isOffline) {
      logger.info("Skipping DynamoDB read in offline mode");
      return [];
    }

    const orders = await this.orderRepository.list();

    return orders
      .slice()
      .sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      })
      .map((order) => this.deserializeOrder(order));
  }

  private deserializeOrder(order: StoredOrder): Omit<Order, "items"> & { items: OrderItem[] } {
    let parsedItems: OrderItem[] = [];

    try {
      if (typeof order.items === "string") {
        parsedItems = JSON.parse(order.items) as OrderItem[];
      } else if (Array.isArray(order.items)) {
        parsedItems = order.items;
      }
    } catch {
      logger.error("Failed to parse stored order items", { orderId: order.orderId });
    }

    return {
      orderId: order.orderId ?? "",
      status: order.status === "PENDING" ? "PENDING" : "PENDING",
      createdAt: order.createdAt ?? "",
      items: parsedItems,
    };
  }
}
