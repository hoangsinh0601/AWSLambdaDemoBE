import type { OrderItem, OrderStatus } from "./Order";

export type EventType = "OrderCreated" | "OrderStatusUpdated";

export interface BaseEvent {
  eventType: EventType;
  timestamp: string;
}

export interface OrderCreatedEvent extends BaseEvent {
  eventType: "OrderCreated";
  orderId: string;
  userId: string;
  userEmail: string;
  customerName: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
}

export interface OrderStatusUpdatedEvent extends BaseEvent {
  eventType: "OrderStatusUpdated";
  orderId: string;
  userId: string;
  userEmail: string;
  customerName: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
}

export type OrderEvent = OrderCreatedEvent | OrderStatusUpdatedEvent;
