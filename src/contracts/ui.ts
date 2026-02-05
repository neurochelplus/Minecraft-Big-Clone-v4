import type { InventorySlot } from "./inventory";

export interface IInventoryUI {
  refresh(): void;
  onInventoryChange: (() => void) | null;
}

export interface IDragDrop {
  setInventoryOpen(isOpen: boolean): void;
  getDraggedItem(): InventorySlot | null;
  setDraggedItem(item: InventorySlot | null): void;
}

export interface ICraftingUI {
  setVisible(visible: boolean, isCraftingTable: boolean): void;
  updateVisuals(): void;
}

export interface IFurnaceUI {
  open(x: number, y: number, z: number): void;
  close(): void;
  isVisible(): boolean;
  updateVisuals(): void;
}
