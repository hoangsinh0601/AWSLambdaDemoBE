import { PublishCommand } from "@aws-sdk/client-sns";
import { v4 as uuidv4 } from "uuid";
import { OrderRepository } from "../repositories/OrderRepository";
import { snsClient } from "../libs/sns";
import type { CreateOrderRequest, Order, OrderItem, OrderStatus, StoredOrder } from "../models/Order";
import { ORDER_STATUSES, ORDER_STATUS_TRANSITIONS } from "../models/Order";
import type { OrderCreatedEvent, OrderStatusUpdatedEvent } from "../models/Event";
import { ForbiddenError, NotFoundError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";
import { EmailService } from "./EmailService";

export class OrderService {
  constructor(
    private readonly orderRepository = new OrderRepository(),
    private readonly emailService = new EmailService()
  ) {}

  async createOrder(payload: CreateOrderRequest, isOffline: boolean): Promise<Order> {
    const totalAmount = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const now = new Date().toISOString();

    const order: Order = {
      orderId: uuidv4(),
      userId: payload.userId,
      userEmail: payload.userEmail,
      customerName: payload.customerName,
      status: "PENDING",
      items: payload.items,
      notes: payload.notes,
      totalAmount,
      createdAt: now,
      updatedAt: now,
    };

    if (isOffline) {
      logger.info("Skipping external AWS calls in offline mode", { orderId: order.orderId });
      return order;
    }

    await this.orderRepository.create(order);

    const event: OrderCreatedEvent = {
      eventType: "OrderCreated",
      orderId: order.orderId,
      userId: order.userId,
      userEmail: order.userEmail,
      customerName: order.customerName,
      status: order.status,
      items: order.items,
      totalAmount: order.totalAmount,
      timestamp: now,
    };

    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.NEW_ORDER_TOPIC_ARN,
        Subject: "New F&B Order",
        Message: JSON.stringify(event),
      })
    );

    logger.info("Order created and event published", { orderId: order.orderId, totalAmount });
    return order;
  }

  async getOrder(orderId: string, isOffline: boolean, requester?: { userId: string; role: string }): Promise<Order> {
    if (isOffline) {
      throw new NotFoundError("Order", orderId);
    }

    const stored = await this.orderRepository.getById(orderId);
    if (!stored) {
      throw new NotFoundError("Order", orderId);
    }

    const order = this.deserializeOrder(stored);
    this.assertCanAccessOrder(order, requester);
    return order;
  }

  async updateOrderStatus(orderId: string, newStatus: OrderStatus, isOffline: boolean): Promise<Order> {
    if (!ORDER_STATUSES.includes(newStatus)) {
      throw new ValidationError(`Invalid status: ${newStatus}. Must be one of: ${ORDER_STATUSES.join(", ")}`);
    }

    if (isOffline) {
      throw new NotFoundError("Order", orderId);
    }

    const stored = await this.orderRepository.getById(orderId);
    if (!stored) {
      throw new NotFoundError("Order", orderId);
    }

    const currentOrder = this.deserializeOrder(stored);
    const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentOrder.status];

    if (!allowedTransitions.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from '${currentOrder.status}' to '${newStatus}'. Allowed: ${allowedTransitions.join(", ") || "none"}`
      );
    }

    const now = new Date().toISOString();
    await this.orderRepository.updateStatus(orderId, newStatus, now);

    const event: OrderStatusUpdatedEvent = {
      eventType: "OrderStatusUpdated",
      orderId,
      userId: currentOrder.userId,
      userEmail: currentOrder.userEmail,
      customerName: currentOrder.customerName,
      previousStatus: currentOrder.status,
      newStatus,
      timestamp: now,
    };

    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.NEW_ORDER_TOPIC_ARN,
        Subject: "Order Status Updated",
        Message: JSON.stringify(event),
      })
    );

    logger.info("Order status updated", {
      orderId,
      previousStatus: currentOrder.status,
      newStatus,
    });

    await this.emailService.sendOrderStatusEmail(
      currentOrder.userEmail,
      currentOrder.customerName,
      orderId,
      newStatus
    );

    return { ...currentOrder, status: newStatus, updatedAt: now };
  }

  async listOrders(isOffline: boolean, requester?: { userId: string; role: string }): Promise<Order[]> {
    if (isOffline) {
      logger.info("Skipping DynamoDB read in offline mode");
      return [];
    }

    const orders =
      requester?.role === "ADMIN"
        ? await this.orderRepository.list()
        : await this.orderRepository.listByUserId(requester?.userId ?? "");

    return orders
      .slice()
      .sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      })
      .map((order) => this.deserializeOrder(order));
  }

  private assertCanAccessOrder(order: Order, requester?: { userId: string; role: string }) {
    if (!requester) {
      throw new ForbiddenError("Order access denied");
    }

    if (requester.role === "ADMIN") {
      return;
    }

    if (requester.userId !== order.userId) {
      throw new ForbiddenError("You do not have access to this order");
    }
  }

  private deserializeOrder(order: StoredOrder): Order {
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
      userId: order.userId ?? "",
      userEmail: order.userEmail ?? "",
      customerName: order.customerName ?? "",
      status: order.status,
      items: parsedItems,
      notes: order.notes,
      totalAmount: order.totalAmount ?? 0,
      createdAt: order.createdAt ?? "",
      updatedAt: order.updatedAt ?? order.createdAt ?? "",
    };
  }
}
