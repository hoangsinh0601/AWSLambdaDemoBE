export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Valid status transitions: current → allowed next statuses */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
} as const;

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  notes?: string;
  customerName: string;
  userEmail: string;
  userId: string;
}

export interface Order {
  orderId: string;
  userId: string;
  userEmail: string;
  customerName: string;
  status: OrderStatus;
  items: OrderItem[];
  notes?: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredOrder extends Omit<Order, "items"> {
  items: string | OrderItem[];
}
