import type { InventoryAdjustmentResult } from "./Inventory";

export interface MenuItem {
  menuItemId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  available: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItemWithInventory extends MenuItem {
  inventory: InventoryAdjustmentResult;
}
