import type { InventorySlot } from "../contracts/inventory";
import { worldDB } from "../utils/DB";
import type { IStorage } from "../contracts/storage";
import { SMELTING_RECIPES, FUEL_ITEMS } from "./Recipes";
import { logger } from "../utils/Logger";

export interface FurnaceData {
  x: number;
  y: number;
  z: number;
  rotation: number; // 0=North, 1=East, 2=South, 3=West
  input: InventorySlot;
  fuel: InventorySlot;
  output: InventorySlot;
  burnTime: number; // Remaining seconds for current fuel
  maxBurnTime: number; // Total seconds for the fuel item consumed
  cookTime: number; // Current cook progress (seconds)
  totalCookTime: number; // Seconds required to cook current item
}

export class FurnaceManager {
  private static instance: FurnaceManager;
  private furnaces: Map<string, FurnaceData> = new Map();
  private dirty: boolean = false;
  private storage: IStorage = worldDB;
  private worldId: string = "default";

  private constructor() {}

  public static getInstance(): FurnaceManager {
    if (!FurnaceManager.instance) {
      FurnaceManager.instance = new FurnaceManager();
    }
    return FurnaceManager.instance;
  }

  public setWorldId(worldId: string): void {
    if (this.worldId === worldId) {
      return;
    }

    this.worldId = worldId;
    this.furnaces.clear();
    this.dirty = false;
  }

  private getWorldPrefix(worldId: string = this.worldId): string {
    return `w:${worldId}:f:`;
  }

  private toStorageKey(localKey: string): string {
    return `${this.getWorldPrefix()}${localKey}`;
  }

  private fromStorageKey(storageKey: string): string {
    return storageKey.slice(this.getWorldPrefix().length);
  }

  public getFurnace(x: number, y: number, z: number): FurnaceData | undefined {
    return this.furnaces.get(`${x},${y},${z}`);
  }

  public createFurnace(x: number, y: number, z: number, rotation: number = 0) {
    const key = `${x},${y},${z}`;
    if (this.furnaces.has(key)) return;

    this.furnaces.set(key, {
      x,
      y,
      z,
      rotation,
      input: { id: 0, count: 0 },
      fuel: { id: 0, count: 0 },
      output: { id: 0, count: 0 },
      burnTime: 0,
      maxBurnTime: 0,
      cookTime: 0,
      totalCookTime: 10, // Default 10 seconds
    });
    this.dirty = true;
  }

  public removeFurnace(x: number, y: number, z: number): InventorySlot[] {
    const key = `${x},${y},${z}`;
    const furnace = this.furnaces.get(key);
    if (!furnace) return [];

    const drops: InventorySlot[] = [];
    if (furnace.input.count > 0 && furnace.input.id !== 0)
      drops.push({ ...furnace.input });
    if (furnace.fuel.count > 0 && furnace.fuel.id !== 0)
      drops.push({ ...furnace.fuel });
    if (furnace.output.count > 0 && furnace.output.id !== 0)
      drops.push({ ...furnace.output });

    this.furnaces.delete(key);
    this.dirty = true;
    void this.storage.delete(this.toStorageKey(key), "blockEntities");

    return drops;
  }

  public tick(deltaTime: number) {
    // deltaTime РІ СЃРµРєСѓРЅРґР°С… - РІСЂРµРјСЏ СЃ РїРѕСЃР»РµРґРЅРµРіРѕ РєР°РґСЂР°
    this.furnaces.forEach((furnace) => {
      let isBurning = furnace.burnTime > 0;
      let inventoryChanged = false;

      // РЈРјРµРЅСЊС€Р°РµРј РІСЂРµРјСЏ РіРѕСЂРµРЅРёСЏ С‚РѕРїР»РёРІР°
      if (isBurning) {
        furnace.burnTime -= deltaTime;
        if (furnace.burnTime < 0) furnace.burnTime = 0;
      }

      // РџСЂРѕРІРµСЂСЏРµРј, РЅСѓР¶РЅРѕ Р»Рё СЃР¶РµС‡СЊ РЅРѕРІРѕРµ С‚РѕРїР»РёРІРѕ
      // РўРѕРїР»РёРІРѕ СЃР¶РёРіР°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ РµСЃР»Рё РµСЃС‚СЊ С‡С‚Рѕ РїР»Р°РІРёС‚СЊ
      if (!isBurning && this.canSmelt(furnace)) {
        const fuelValue = this.getFuelBurnTime(furnace.fuel.id);
        if (fuelValue > 0) {
          furnace.fuel.count--;
          if (furnace.fuel.count === 0) furnace.fuel.id = 0;
          furnace.burnTime = fuelValue;
          furnace.maxBurnTime = fuelValue;
          isBurning = true;
          inventoryChanged = true;
        }
      } else if (!isBurning && furnace.burnTime <= 0) {
        // РќРµ РіРѕСЂРёС‚, РЅРµС‡РµРіРѕ РїР»Р°РІРёС‚СЊ РёР»Рё РЅРµС‚ С‚РѕРїР»РёРІР°
      }

      // Р›РѕРіРёРєР° РїСЂРёРіРѕС‚РѕРІР»РµРЅРёСЏ
      if (isBurning && this.canSmelt(furnace)) {
        furnace.cookTime += deltaTime;
        if (furnace.cookTime >= furnace.totalCookTime) {
          this.smelt(furnace); // Р—Р°РІРµСЂС€Р°РµРј РїР»Р°РІРєСѓ
          inventoryChanged = true;
        }
      } else {
        // РЎР±СЂР°СЃС‹РІР°РµРј РїСЂРѕРіСЂРµСЃСЃ РїСЂРёРіРѕС‚РѕРІР»РµРЅРёСЏ, РµСЃР»Рё РїРµС‡СЊ РЅРµ РіРѕСЂРёС‚
        if (furnace.cookTime > 0) {
          furnace.cookTime = Math.max(0, furnace.cookTime - deltaTime * 2);
          // inventoryChanged = true; // РўРѕР»СЊРєРѕ РІРёР·СѓР°Р»СЊРЅРѕРµ РёР·РјРµРЅРµРЅРёРµ
        }
      }

      if (inventoryChanged) {
        this.dirty = true; // РџРѕРјРµС‡Р°РµРј РґР»СЏ СЃРѕС…СЂР°РЅРµРЅРёСЏ
      }
    });
  }

  // РџСЂРѕРІРµСЂСЏРµС‚, РјРѕР¶РЅРѕ Р»Рё РїРµСЂРµРїР»Р°РІРёС‚СЊ РїСЂРµРґРјРµС‚ РІ РїРµС‡Рё
  private canSmelt(furnace: FurnaceData): boolean {
    if (furnace.input.id === 0) return false; // РќРµС‚ РІС…РѕРґРЅРѕРіРѕ РїСЂРµРґРјРµС‚Р°
    const result = this.getSmeltingResult(furnace.input.id);
    if (!result) return false; // РџСЂРµРґРјРµС‚ РЅРµР»СЊР·СЏ РїРµСЂРµРїР»Р°РІРёС‚СЊ
    if (furnace.output.id === 0) return true; // Р’С‹С…РѕРґРЅРѕР№ СЃР»РѕС‚ РїСѓСЃС‚
    if (furnace.output.id !== result.id) return false; // Р”СЂСѓРіРѕР№ РїСЂРµРґРјРµС‚ РІ РІС‹С…РѕРґРµ
    if (furnace.output.count + result.count > 64) return false; // РџРµСЂРµРїРѕР»РЅРµРЅРёРµ СЃС‚Р°РєР°
    return true;
  }

  // Р’С‹РїРѕР»РЅСЏРµС‚ РїР»Р°РІРєСѓ: Р·Р°Р±РёСЂР°РµС‚ РІС…РѕРґРЅРѕР№ РїСЂРµРґРјРµС‚, РґРѕР±Р°РІР»СЏРµС‚ СЂРµСЃСѓР»СЊС‚Р°С‚
  private smelt(furnace: FurnaceData) {
    const result = this.getSmeltingResult(furnace.input.id);
    if (!result) return;

    // Р—Р°Р±РёСЂР°РµРј 1 РїСЂРµРґРјРµС‚ РёР· РІС…РѕРґР°
    furnace.input.count--;
    if (furnace.input.count === 0) furnace.input.id = 0;

    // Р”РѕР±Р°РІР»СЏРµРј СЂРµР·СѓР»СЊС‚Р°С‚ РІ РІС‹С…РѕРґ
    if (furnace.output.id === 0) {
      furnace.output.id = result.id;
      furnace.output.count = result.count;
    } else {
      furnace.output.count += result.count;
    }
    furnace.cookTime = 0; // РЎР±СЂР°СЃС‹РІР°РµРј РїСЂРѕРіСЂРµСЃСЃ
  }

  // РџРѕР»СѓС‡РёС‚СЊ РІСЂРµРјСЏ РіРѕСЂРµРЅРёСЏ С‚РѕРїР»РёРІР° РїРѕ ID РїСЂРµРґРјРµС‚Р°
  // Р’РѕР·РІСЂР°С‰Р°РµС‚ 0, РµСЃР»Рё РїСЂРµРґРјРµС‚ РЅРµ СЏРІР»СЏРµС‚СЃСЏ С‚РѕРїР»РёРІРѕРј
  private getFuelBurnTime(id: number): number {
    const fuel = FUEL_ITEMS.find((f) => f.id === id);
    return fuel ? fuel.burnTime : 0;
  }

  // РџРѕР»СѓС‡РёС‚СЊ СЂРµР·СѓР»СЊС‚Р°С‚ РїР»Р°РІРєРё РґР»СЏ РІС…РѕРґРЅРѕРіРѕ РїСЂРµРґРјРµС‚Р°
  // Р’РѕР·РІСЂР°С‰Р°РµС‚ null, РµСЃР»Рё РїСЂРµРґРјРµС‚ РЅРµР»СЊР·СЏ РїРµСЂРµРїР»Р°РІРёС‚СЊ
  private getSmeltingResult(id: number): { id: number; count: number } | null {
    const recipe = SMELTING_RECIPES.find((r) => r.input === id);
    return recipe ? recipe.output : null;
  }

  // РЎРѕС…СЂР°РЅРµРЅРёРµ РІСЃРµС… РїРµС‡РµР№ РІ IndexedDB
  public async save() {
    if (!this.dirty) return; // РќРµС‚ РёР·РјРµРЅРµРЅРёР№ - РЅРµ СЃРѕС…СЂР°РЅСЏРµРј
    const promises: Promise<void>[] = [];
    this.furnaces.forEach((data, key) => {
      promises.push(this.storage.set(this.toStorageKey(key), data, "blockEntities"));
    });
    await Promise.all(promises);
    this.dirty = false;
  }

  // Р—Р°РіСЂСѓР·РєР° РІСЃРµС… РїС‡РµР№ РёР· IndexedDB РїСЂРё СЃС‚Р°СЂС‚Рµ РёРіСЂС‹
  public async load() {
    try {
      await this.storage.init(); // РЈР±РµР¶РґР°РµРјСЃСЏ, С‡С‚Рѕ Р‘Р” РѕС‚РєСЂС‹С‚Р°
      this.furnaces.clear();
      const keys = await this.storage.keysByPrefix(
        "blockEntities",
        this.getWorldPrefix(),
      );
      for (const key of keys) {
        const data = await this.storage.get<FurnaceData>(
          key,
          "blockEntities",
        );
        if (data) {
          this.furnaces.set(this.fromStorageKey(key), data);
        }
      }
      logger.debug(`Loaded ${this.furnaces.size} furnaces.`);
    } catch (e) {
      console.warn("Failed to load block entities", e);
    }
  }
}
