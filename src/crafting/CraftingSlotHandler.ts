import type { ICrafting } from "../contracts/crafting";
import type { IDragDrop } from "../contracts/ui";
import type { InventorySlot } from "../contracts/inventory";

export class CraftingSlotHandler {
  private craftingSystem: ICrafting;
  private dragDrop: IDragDrop;
  private onUpdate: () => void;

  constructor(
    craftingSystem: ICrafting,
    dragDrop: IDragDrop,
    onUpdate: () => void,
  ) {
    this.craftingSystem = craftingSystem;
    this.dragDrop = dragDrop;
    this.onUpdate = onUpdate;
  }

  public handleCraftSlotClick(index: number, button: number = 0) {
    const slot = this.craftingSystem.craftingSlots[index];
    let draggedItem = this.dragDrop.getDraggedItem();

    if (!draggedItem) {
      draggedItem = this.handlePickup(slot, button);
    } else {
      draggedItem = this.handlePlace(slot, draggedItem, button);
    }

    this.dragDrop.setDraggedItem(draggedItem);
    this.onUpdate();
  }

  public handleResultClick() {
    const result = this.craftingSystem.craftingResult;
    if (result.id === 0) return;

    let draggedItem = this.dragDrop.getDraggedItem();

    if (!draggedItem) {
      draggedItem = { ...result };
      this.craftingSystem.consumeIngredients();
      this.dragDrop.setDraggedItem(draggedItem);
    } else if (draggedItem.id === result.id) {
      draggedItem.count += result.count;
      this.craftingSystem.consumeIngredients();
      this.dragDrop.setDraggedItem(draggedItem);
    }

    this.onUpdate();
  }

  private handlePickup(
    slot: { id: number; count: number },
    button: number,
  ): { id: number; count: number } | null {
    if (slot.id === 0) return null;

    let draggedItem: { id: number; count: number } | null = null;

    if (button === 2) {
      const half = Math.ceil(slot.count / 2);
      draggedItem = { id: slot.id, count: half };
      slot.count -= half;
      if (slot.count === 0) slot.id = 0;
    } else {
      draggedItem = { ...slot };
      slot.id = 0;
      slot.count = 0;
    }

    this.craftingSystem.checkRecipes();
    return draggedItem;
  }

  private handlePlace(
    slot: { id: number; count: number },
    draggedItem: InventorySlot,
    button: number,
  ): InventorySlot | null {
    let nextItem: InventorySlot | null = draggedItem;

    if (slot.id === 0) {
      if (button === 2) {
        slot.id = nextItem.id;
        slot.count = 1;
        nextItem.count--;
        if (nextItem.count === 0) nextItem = null;
      } else {
        slot.id = nextItem.id;
        slot.count = nextItem.count;
        nextItem = null;
      }
      this.craftingSystem.checkRecipes();
    } else if (slot.id === nextItem.id) {
      if (button === 2) {
        slot.count++;
        nextItem.count--;
        if (nextItem.count === 0) nextItem = null;
      } else {
        slot.count += nextItem.count;
        nextItem = null;
      }
      this.craftingSystem.checkRecipes();
    } else {
      const temp = { ...slot };
      slot.id = nextItem.id;
      slot.count = nextItem.count;
      nextItem = temp;
      this.craftingSystem.checkRecipes();
    }

    return nextItem;
  }
}
