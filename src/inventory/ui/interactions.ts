import type { InventoryUIContext, SlotClickHandler } from "./types";

export function initGlobalListeners(
  context: InventoryUIContext,
  handleSlotClick: SlotClickHandler,
): void {
  window.addEventListener("touchend", (e) => {
    const draggedItem = context.dragDrop.getDraggedItem();
    if (draggedItem && context.inventoryMenu.style.display !== "none") {
      const touch = e.changedTouches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const slotEl = target?.closest(".slot") as HTMLElement | null;

      if (slotEl) {
        if (
          !context.hotbarContainer.contains(slotEl) &&
          !context.inventoryGrid.contains(slotEl)
        ) {
          if (slotEl.classList.contains("slot")) {
            const event = new MouseEvent("mousedown", {
              bubbles: true,
              cancelable: true,
              view: window,
              button: 0,
            });
            slotEl.dispatchEvent(event);
          }
        } else {
          const targetIndex = parseInt(slotEl.getAttribute("data-index") || "-1");
          if (targetIndex !== -1) {
            handleSlotClick(targetIndex);
          }
        }
      } else {
        const touchStartSlotIndex = context.getTouchStartSlotIndex();
        if (touchStartSlotIndex !== null) {
          handleSlotClick(touchStartSlotIndex);
        }
      }

      context.setTouchStartSlotIndex(null);
    }
  });
}

export function handleSlotClick(
  context: InventoryUIContext,
  index: number,
  button: number = 0,
): void {
  const slot = context.inventory.getSlot(index);
  let draggedItem = context.dragDrop.getDraggedItem();

  if (!draggedItem) {
    if (slot.id !== 0) {
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
    }
  } else {
    if (slot.id === 0) {
      if (button === 2) {
        slot.id = draggedItem.id;
        slot.count = 1;
        draggedItem.count--;
        if (draggedItem.count === 0) draggedItem = null;
      } else {
        slot.id = draggedItem.id;
        slot.count = draggedItem.count;
        draggedItem = null;
      }
    } else if (slot.id === draggedItem.id) {
      const isTool = slot.id >= 20;
      const maxStack = isTool ? 1 : 64;

      if (slot.count >= maxStack) {
        const temp = { ...slot };
        slot.id = draggedItem.id;
        slot.count = draggedItem.count;
        draggedItem = temp;
      } else {
        if (button === 2) {
          slot.count++;
          draggedItem.count--;
          if (draggedItem.count === 0) draggedItem = null;
        } else {
          const space = maxStack - slot.count;
          const move = Math.min(space, draggedItem.count);
          slot.count += move;
          draggedItem.count -= move;
          if (draggedItem.count === 0) draggedItem = null;
        }
      }
    } else {
      const temp = { ...slot };
      slot.id = draggedItem.id;
      slot.count = draggedItem.count;
      draggedItem = temp;
    }
  }

  context.inventory.setSlot(index, slot);
  context.dragDrop.setDraggedItem(draggedItem);

  context.refresh();
  const onInventoryChange = context.getOnInventoryChange();
  if (onInventoryChange) onInventoryChange();
}
