export type InventoryHistoryAction =
  | "MANUAL_UPDATE"
  | "ORDER_CONFIRMED"
  | "DAILY_RESET"
  | "INITIALIZED";

export interface InventoryHistoryItem {
  historyId: string;
  menuItemId: string;
  action: InventoryHistoryAction;
  quantityDelta: number;
  previousCurrentStock: number;
  nextCurrentStock: number;
  previousDailySold: number;
  nextDailySold: number;
  previousDailyLimit: number;
  nextDailyLimit: number;
  actor: string;
  note: string;
  createdAt: string;
}
