export interface InventoryItem {
  menuItemId: string;
  currentStock: number;
  dailyLimit: number;
  dailySold: number;
  lastResetDate: string;
  updatedAt: string;
}

export interface InventoryAdjustmentResult {
  menuItemId: string;
  currentStock: number;
  dailyLimit: number;
  dailySold: number;
  remainingToday: number;
  inStock: boolean;
}
