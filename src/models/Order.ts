export type OrderStatus = "PENDING";

export interface OrderItem {
  name: string;
  quantity: number;
}

export interface CreateOrderRequest {
  items: OrderItem[];
}

export interface Order {
  orderId: string;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
}

export interface StoredOrder extends Omit<Order, "items"> {
  items: string | OrderItem[];
}
