import type { InventoryAdjustmentResult, InventoryItem } from "../models/Inventory";
import type { MenuItem } from "../models/MenuItem";
import type { OrderItem } from "../models/Order";
import { InventoryRepository } from "../repositories/InventoryRepository";
import { MenuRepository } from "../repositories/MenuRepository";
import { NotFoundError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

const todayString = () => new Date().toISOString().slice(0, 10);

export class InventoryService {
  constructor(
    private readonly inventoryRepository = new InventoryRepository(),
    private readonly menuRepository = new MenuRepository()
  ) {}

  async ensureInventoryForMenuItem(menuItemId: string, defaultValues?: Partial<Pick<InventoryItem, "currentStock" | "dailyLimit">>): Promise<InventoryItem> {
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
      lastResetDate: todayString(),
      updatedAt: now,
    };

    await this.inventoryRepository.create(item);
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
        const currentInventory = inventoryMap.get(menuItem.menuItemId) ?? (await this.ensureInventoryForMenuItem(menuItem.menuItemId));
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

  async updateInventory(menuItemId: string, payload: Partial<Pick<InventoryItem, "currentStock" | "dailyLimit">>): Promise<InventoryAdjustmentResult> {
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
    await this.inventoryRepository.update(menuItemId, {
      currentStock: payload.currentStock ?? current.currentStock,
      dailyLimit: payload.dailyLimit ?? current.dailyLimit,
      updatedAt: now,
    });

    const updated = await this.ensureInventoryForMenuItem(menuItemId);
    return this.toAdjustmentResult(updated);
  }

  async adjustInventoryForConfirmedOrder(items: OrderItem[]): Promise<void> {
    for (const orderItem of items) {
      const current = await this.ensureInventoryForMenuItem(orderItem.menuItemId);
      const normalized = await this.resetDailyIfNeeded(current);
      const remainingToday = normalized.dailyLimit > 0 ? normalized.dailyLimit - normalized.dailySold : Number.POSITIVE_INFINITY;

      if (normalized.currentStock < orderItem.quantity) {
        throw new ValidationError(`Insufficient current stock for ${orderItem.name}`);
      }

      if (remainingToday < orderItem.quantity) {
        throw new ValidationError(`Daily limit exceeded for ${orderItem.name}`);
      }

      const now = new Date().toISOString();
      await this.inventoryRepository.update(orderItem.menuItemId, {
        currentStock: normalized.currentStock - orderItem.quantity,
        dailySold: normalized.dailySold + orderItem.quantity,
        updatedAt: now,
        lastResetDate: normalized.lastResetDate,
      });

      logger.info("Inventory adjusted for confirmed order", {
        menuItemId: orderItem.menuItemId,
        quantity: orderItem.quantity,
      });
    }
  }

  private async resetDailyIfNeeded(item: InventoryItem): Promise<InventoryItem> {
    const today = todayString();
    if (item.lastResetDate === today) {
      return item;
    }

    const updatedAt = new Date().toISOString();
    await this.inventoryRepository.update(item.menuItemId, {
      dailySold: 0,
      lastResetDate: today,
      updatedAt,
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
}
