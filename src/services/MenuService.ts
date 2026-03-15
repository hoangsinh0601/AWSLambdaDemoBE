import { v4 as uuidv4 } from "uuid";
import { MenuRepository } from "../repositories/MenuRepository";
import type { MenuItem, MenuItemWithInventory } from "../models/MenuItem";
import { NotFoundError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";
import { InventoryService } from "./InventoryService";

export interface CreateMenuItemRequest {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  available?: boolean;
  sortOrder?: number;
}

export interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  imageUrl?: string;
  available?: boolean;
  sortOrder?: number;
}

const SEED_MENU_ITEMS: Omit<MenuItem, "menuItemId" | "createdAt" | "updatedAt">[] = [
  { name: "Ramen Tonkotsu", description: "Nuoc dung ham xuong heo 12 gio, mi tuoi, trung long dao, cha shu va hanh la.", price: 89000, category: "main", imageUrl: "", available: true, sortOrder: 1 },
  { name: "Sushi Ca Hoi", description: "Set 8 mieng sushi ca hoi tuoi voi com tron giam, wasabi va gung ngam.", price: 119000, category: "main", imageUrl: "", available: true, sortOrder: 2 },
  { name: "Gyoza Chien", description: "6 mieng hoanh thanh chien gion nhan thit heo va rau cu, kem nuoc cham dac biet.", price: 49000, category: "appetizer", imageUrl: "", available: true, sortOrder: 3 },
  { name: "Bun Bo Hue", description: "Bun bo Hue truyen thong voi nuoc dung cay nong, thit bo, gio heo va rau song.", price: 75000, category: "main", imageUrl: "", available: true, sortOrder: 4 },
  { name: "Banh Mi Thit Nuong", description: "Banh mi gion voi thit heo nuong, do chua, rau thom va tuong ot.", price: 35000, category: "main", imageUrl: "", available: true, sortOrder: 5 },
  { name: "Tra Da", description: "Ly tra da mat lanh, phu hop moi combo.", price: 12000, category: "drink", imageUrl: "", available: true, sortOrder: 6 },
  { name: "Ca Phe Sua Da", description: "Ca phe phin Viet Nam voi sua dac, da lanh.", price: 29000, category: "drink", imageUrl: "", available: true, sortOrder: 7 },
  { name: "Nuoc Ep Cam", description: "Nuoc cam tuoi vat, khong duong them, lanh.", price: 35000, category: "drink", imageUrl: "", available: true, sortOrder: 8 },
];

export class MenuService {
  constructor(
    private readonly menuRepository = new MenuRepository(),
    private readonly inventoryService = new InventoryService()
  ) {}

  async listAvailable(): Promise<MenuItemWithInventory[]> {
    const items = await this.inventoryService.listWithMenu();
    return items
      .filter((item) => item.available)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async listAll(): Promise<MenuItem[]> {
    const items = await this.menuRepository.list();
    return items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async getById(menuItemId: string): Promise<MenuItem> {
    const item = await this.menuRepository.getById(menuItemId);
    if (!item) {
      throw new NotFoundError("MenuItem", menuItemId);
    }
    return item;
  }

  async createMenuItem(request: CreateMenuItemRequest): Promise<MenuItem> {
    if (!request.name?.trim()) throw new ValidationError("name is required");
    if (typeof request.price !== "number" || request.price < 0) throw new ValidationError("price must be a non-negative number");
    if (!request.category?.trim()) throw new ValidationError("category is required");

    const now = new Date().toISOString();
    const item: MenuItem = {
      menuItemId: uuidv4(),
      name: request.name.trim(),
      description: request.description?.trim() ?? "",
      price: request.price,
      category: request.category.trim(),
      imageUrl: request.imageUrl ?? "",
      available: request.available ?? true,
      sortOrder: request.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.menuRepository.create(item);
    await this.inventoryService.ensureInventoryForMenuItem(item.menuItemId, {
      currentStock: 0,
      dailyLimit: 0,
    });
    logger.info("Menu item created", { menuItemId: item.menuItemId });
    return item;
  }

  async updateMenuItem(menuItemId: string, request: UpdateMenuItemRequest): Promise<MenuItem> {
    const existing = await this.menuRepository.getById(menuItemId);
    if (!existing) {
      throw new NotFoundError("MenuItem", menuItemId);
    }

    if (request.price !== undefined && (typeof request.price !== "number" || request.price < 0)) {
      throw new ValidationError("price must be a non-negative number");
    }

    const now = new Date().toISOString();
    await this.menuRepository.update(menuItemId, { ...request, updatedAt: now });
    logger.info("Menu item updated", { menuItemId });

    return { ...existing, ...request, updatedAt: now };
  }

  async deleteMenuItem(menuItemId: string): Promise<void> {
    const existing = await this.menuRepository.getById(menuItemId);
    if (!existing) {
      throw new NotFoundError("MenuItem", menuItemId);
    }

    await this.menuRepository.delete(menuItemId);
    logger.info("Menu item deleted", { menuItemId });
  }

  async seedMenu(): Promise<MenuItem[]> {
    const existing = await this.menuRepository.list();
    if (existing.length > 0) {
      logger.info("Menu already has items, skipping seed", { count: existing.length });
      return existing;
    }

    const now = new Date().toISOString();
    const items: MenuItem[] = SEED_MENU_ITEMS.map((item) => ({
      ...item,
      menuItemId: uuidv4(),
      createdAt: now,
      updatedAt: now,
    }));

    await this.menuRepository.batchCreate(items);
    await Promise.all(
      items.map((item) =>
        this.inventoryService.ensureInventoryForMenuItem(item.menuItemId, {
          currentStock: 20,
          dailyLimit: 50,
        })
      )
    );
    logger.info("Menu seeded successfully", { count: items.length });
    return items;
  }
}
