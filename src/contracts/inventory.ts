export type InventorySlot = {
  id: number;
  count: number;
  durability?: number;
  maxDurability?: number;
};

export interface IInventory {
  getSlots(): InventorySlot[];
  getSlot(index: number): InventorySlot;
  setSlot(index: number, slot: InventorySlot): void;
  getSelectedSlot(): number;
  setSelectedSlot(index: number): void;
  getSelectedSlotItem(): InventorySlot;
  addItem(id: number, count: number): number;
  removeItem(id: number, count: number): boolean;
  clear(): void;
  serialize(): InventorySlot[];
  deserialize(data: InventorySlot[]): void;
}
