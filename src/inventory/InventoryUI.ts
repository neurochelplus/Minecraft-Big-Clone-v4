import type { IInventory } from "../contracts/inventory";
import { DragDrop } from "./DragDrop";
import {
  handleSlotClick,
  initGlobalListeners,
  initSlots,
  refreshInventory,
  resolveInventoryDom,
} from "./ui/index";
import type { InventoryUIContext } from "./ui/index";

export class InventoryUI {
  private inventory: IInventory;
  private dragDrop: DragDrop;
  private touchStartSlotIndex: number | null = null;
  private context: InventoryUIContext;

  public onInventoryChange: (() => void) | null = null;

  constructor(inventory: IInventory, dragDrop: DragDrop) {
    this.inventory = inventory;
    this.dragDrop = dragDrop;

    const dom = resolveInventoryDom();

    this.context = {
      inventory: this.inventory,
      dragDrop: this.dragDrop,
      hotbarContainer: dom.hotbarContainer,
      inventoryGrid: dom.inventoryGrid,
      inventoryMenu: dom.inventoryMenu,
      tooltip: dom.tooltip,
      getTouchStartSlotIndex: () => this.touchStartSlotIndex,
      setTouchStartSlotIndex: (index) => {
        this.touchStartSlotIndex = index;
      },
      getOnInventoryChange: () => this.onInventoryChange,
      refresh: () => this.refresh(),
    };

    const clickHandler = (index: number, button: number = 0) => {
      handleSlotClick(this.context, index, button);
    };

    initSlots(this.context, clickHandler);
    initGlobalListeners(this.context, clickHandler);
  }

  public refresh() {
    refreshInventory(this.context);
  }
}
