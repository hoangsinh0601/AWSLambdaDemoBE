import type { Order, OrderItem, OrderStatus } from "./Order";

export interface NewOrderEvent extends Pick<Order, "orderId" | "createdAt"> {
  status: OrderStatus;
  items: OrderItem[];
}
