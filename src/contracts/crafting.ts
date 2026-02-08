export type CraftingSlot = {
  id: number;
  count: number;
};

export interface ICrafting {
  craftingSlots: CraftingSlot[];
  craftingResult: CraftingSlot;
  isCraftingTable: boolean;
  setCraftingTable(isTable: boolean): void;
  checkRecipes(): void;
  consumeIngredients(): void;
}

export interface IFurnaceManager {
  getFurnace(x: number, y: number, z: number): {
    rotation: number;
    input: CraftingSlot;
    fuel: CraftingSlot;
    output: CraftingSlot;
    burnTime: number;
    maxBurnTime: number;
    cookTime: number;
    totalCookTime: number;
  } | undefined;
  createFurnace(x: number, y: number, z: number, rotation?: number): void;
  removeFurnace(x: number, y: number, z: number): CraftingSlot[];
  tick(deltaTime: number): void;
  load(): Promise<void>;
  save(): Promise<void> | void;
}
