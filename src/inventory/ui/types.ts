import type { IInventory } from "../../contracts/inventory";
import { DragDrop } from "../DragDrop";

export type InventoryUIContext = {
  inventory: IInventory;
  dragDrop: DragDrop;
  hotbarContainer: HTMLElement;
  inventoryGrid: HTMLElement;
  inventoryMenu: HTMLElement;
  tooltip: HTMLElement;
  getTouchStartSlotIndex: () => number | null;
  setTouchStartSlotIndex: (index: number | null) => void;
  getOnInventoryChange: () => (() => void) | null;
  refresh: () => void;
};

export type SlotClickHandler = (index: number, button?: number) => void;
