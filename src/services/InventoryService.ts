import { v4 as uuidv4 } from "uuid";
import type { InventoryAdjustmentResult, InventoryItem, InventorySummaryStats } from "../models/Inventory";
import type { InventoryHistoryItem } from "../models/InventoryHistory";
import type { MenuItem } from "../models/MenuItem";
import type { OrderItem } from "../models/Order";
import { InventoryHistoryRepository } from "../repositories/InventoryHistoryRepository";
import { InventoryRepository } from "../repositories/InventoryRepository";
import { MenuRepository } from "../repositories/MenuRepository";
import { NotFoundError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";
import { getVietnamDateString } from "../utils/date";

export class InventoryService {
  constructor(
    private readonly inventoryRepository = new InventoryRepository(),
    private readonly menuRepository = new MenuRepository(),
    private readonly inventoryHistoryRepository = new InventoryHistoryRepository()
  ) {}

  async ensureInventoryForMenuItem(
    menuItemId: string,
    defaultValues?: Partial<Pick<InventoryItem, "currentStock" | "dailyLimit">>
  ): Promise<InventoryItem> {
    const existing = await this.inventoryRepository.getByMenuItemId(menuItemId);
    if (existing) {
      return this.resetDailyIfNeeded(existing);
    }

    const now = new Date().toISOString();
    const item: InventoryItem = {
      menuItemId,
      currentStock: defaultValues?.currentStock ?? 0,
      dailyLimit: defaultValues?.dailyLimit ?? 0,
      dailySold: 0,
      lastResetDate: getVietnamDateString(),
      updatedAt: now,
    };

    await this.inventoryRepository.create(item);
    await this.recordHistory({
      menuItemId,
      action: "INITIALIZED",
      quantityDelta: 0,
      previousCurrentStock: 0,
      nextCurrentStock: item.currentStock,
      previousDailySold: 0,
      nextDailySold: item.dailySold,
      previousDailyLimit: 0,
      nextDailyLimit: item.dailyLimit,
      actor: "system",
      note: "Inventory initialized",
    });
    return item;
  }

  async listWithMenu(): Promise<Array<MenuItem & { inventory: InventoryAdjustmentResult }>> {
    const [menuItems, inventoryItems] = await Promise.all([
      this.menuRepository.list(),
      this.inventoryRepository.list(),
    ]);

    const inventoryMap = new Map(inventoryItems.map((item) => [item.menuItemId, item]));

    const hydrated = await Promise.all(
      menuItems.map(async (menuItem) => {
        const currentInventory =
          inventoryMap.get(menuItem.menuItemId) ??
          (await this.ensureInventoryForMenuItem(menuItem.menuItemId));
        const normalized = await this.resetDailyIfNeeded(currentInventory);
        return {
          ...menuItem,
          inventory: this.toAdjustmentResult(normalized),
        };
      })
    );

    return hydrated.sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  }

  async getInventory(menuItemId: string): Promise<InventoryAdjustmentResult> {
    const item = await this.ensureInventoryForMenuItem(menuItemId);
    return this.toAdjustmentResult(item);
  }

  async updateInventory(
    menuItemId: string,
    payload: Partial<Pick<InventoryItem, "currentStock" | "dailyLimit">>
  ): Promise<InventoryAdjustmentResult> {
    const menuItem = await this.menuRepository.getById(menuItemId);
    if (!menuItem) {
      throw new NotFoundError("MenuItem", menuItemId);
    }

    const current = await this.ensureInventoryForMenuItem(menuItemId);

    if (payload.currentStock !== undefined && payload.currentStock < 0) {
      throw new ValidationError("currentStock must be greater than or equal to 0");
    }

    if (payload.dailyLimit !== undefined && payload.dailyLimit < 0) {
      throw new ValidationError("dailyLimit must be greater than or equal to 0");
    }

    const now = new Date().toISOString();
    const nextCurrentStock = payload.currentStock ?? current.currentStock;
    const nextDailyLimit = payload.dailyLimit ?? current.dailyLimit;

    await this.inventoryRepository.update(menuItemId, {
      currentStock: nextCurrentStock,
      dailyLimit: nextDailyLimit,
      updatedAt: now,
    });

    await this.recordHistory({
      menuItemId,
      action: "MANUAL_UPDATE",
      quantityDelta: nextCurrentStock - current.currentStock,
      previousCurrentStock: current.currentStock,
      nextCurrentStock,
      previousDailySold: current.dailySold,
      nextDailySold: current.dailySold,
      previousDailyLimit: current.dailyLimit,
      nextDailyLimit,
      actor: "admin",
      note: "Admin updated inventory values",
    });

    const updated = await this.ensureInventoryForMenuItem(menuItemId);
    return this.toAdjustmentResult(updated);
  }

  async adjustInventoryForConfirmedOrder(items: OrderItem[]): Promise<void> {
    for (const orderItem of items) {
      const current = await this.ensureInventoryForMenuItem(orderItem.menuItemId);
      const normalized = await this.resetDailyIfNeeded(current);
      const remainingToday =
        normalized.dailyLimit > 0
          ? normalized.dailyLimit - normalized.dailySold
          : Number.POSITIVE_INFINITY;

      if (normalized.currentStock < orderItem.quantity) {
        throw new ValidationError(`Insufficient current stock for ${orderItem.name}`);
      }

      if (remainingToday < orderItem.quantity) {
        throw new ValidationError(`Daily limit exceeded for ${orderItem.name}`);
      }

      const now = new Date().toISOString();
      const nextCurrentStock = normalized.currentStock - orderItem.quantity;
      const nextDailySold = normalized.dailySold + orderItem.quantity;

      await this.inventoryRepository.update(orderItem.menuItemId, {
        currentStock: nextCurrentStock,
        dailySold: nextDailySold,
        updatedAt: now,
        lastResetDate: normalized.lastResetDate,
      });

      await this.recordHistory({
        menuItemId: orderItem.menuItemId,
        action: "ORDER_CONFIRMED",
        quantityDelta: -orderItem.quantity,
        previousCurrentStock: normalized.currentStock,
        nextCurrentStock,
        previousDailySold: normalized.dailySold,
        nextDailySold,
        previousDailyLimit: normalized.dailyLimit,
        nextDailyLimit: normalized.dailyLimit,
        actor: "system",
        note: `Inventory deducted for confirmed order item ${orderItem.name}`,
      });

      logger.info("Inventory adjusted for confirmed order", {
        menuItemId: orderItem.menuItemId,
        quantity: orderItem.quantity,
      });
    }
  }

  async listRecentHistory(limit = 50): Promise<InventoryHistoryItem[]> {
    return this.inventoryHistoryRepository.listRecent(limit);
  }

  async getSummaryStats(): Promise<InventorySummaryStats> {
    const items = await this.listWithMenu();
    return {
      totalMenuItems: items.length,
      inStockItems: items.filter((item) => item.inventory.inStock).length,
      outOfStockItems: items.filter((item) => !item.inventory.inStock).length,
      totalCurrentStock: items.reduce((sum, item) => sum + item.inventory.currentStock, 0),
      totalRemainingToday: items.reduce((sum, item) => sum + item.inventory.remainingToday, 0),
    };
  }

  private async resetDailyIfNeeded(item: InventoryItem): Promise<InventoryItem> {
    const today = getVietnamDateString();
    if (item.lastResetDate === today) {
      return item;
    }

    const updatedAt = new Date().toISOString();
    await this.inventoryRepository.update(item.menuItemId, {
      dailySold: 0,
      lastResetDate: today,
      updatedAt,
    });

    await this.recordHistory({
      menuItemId: item.menuItemId,
      action: "DAILY_RESET",
      quantityDelta: 0,
      previousCurrentStock: item.currentStock,
      nextCurrentStock: item.currentStock,
      previousDailySold: item.dailySold,
      nextDailySold: 0,
      previousDailyLimit: item.dailyLimit,
      nextDailyLimit: item.dailyLimit,
      actor: "system",
      note: "Daily sold counter reset for Vietnam timezone",
    });

    return {
      ...item,
      dailySold: 0,
      lastResetDate: today,
      updatedAt,
    };
  }

  private toAdjustmentResult(item: InventoryItem): InventoryAdjustmentResult {
    const remainingToday = Math.max(item.dailyLimit - item.dailySold, 0);
    return {
      menuItemId: item.menuItemId,
      currentStock: item.currentStock,
      dailyLimit: item.dailyLimit,
      dailySold: item.dailySold,
      remainingToday,
      inStock: item.currentStock > 0 && remainingToday > 0,
    };
  }

  private async recordHistory(
    payload: Omit<InventoryHistoryItem, "historyId" | "createdAt">
  ): Promise<void> {
    await this.inventoryHistoryRepository.create({
      historyId: uuidv4(),
      createdAt: new Date().toISOString(),
      ...payload,
    });
  }
}
