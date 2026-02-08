import { bindTooltipHandlers } from "./tooltip";
import type { InventoryUIContext, SlotClickHandler } from "./types";

export function createSlotElement(
  context: InventoryUIContext,
  index: number,
  isHotbar: boolean,
  handleSlotClick: SlotClickHandler,
): HTMLElement {
  const div = document.createElement("div");
  div.classList.add("slot");
  div.setAttribute("data-index", index.toString());

  const icon = document.createElement("div");
  icon.classList.add("block-icon");
  icon.style.display = "none";
  div.appendChild(icon);

  const count = document.createElement("div");
  count.classList.add("slot-count");
  count.innerText = "";
  div.appendChild(count);

  const durability = document.createElement("div");
  durability.classList.add("slot-durability");
  durability.style.display = "none";
  div.appendChild(durability);

  bindTooltipHandlers(div, index, context);

  div.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    if (context.inventoryMenu.style.display !== "none") {
      handleSlotClick(index, e.button);
    }
  });

  div.addEventListener("touchstart", (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();

    if (context.inventoryMenu.style.display !== "none") {
      context.setTouchStartSlotIndex(index);
      handleSlotClick(index);
    } else if (isHotbar) {
      context.inventory.setSelectedSlot(index);
      context.refresh();
      const onInventoryChange = context.getOnInventoryChange();
      if (onInventoryChange) onInventoryChange();
    }
  });

  return div;
}

export function initSlots(
  context: InventoryUIContext,
  handleSlotClick: SlotClickHandler,
): void {
  context.hotbarContainer.innerHTML = "";
  context.inventoryGrid.innerHTML = "";

  for (let i = 0; i < 9; i++) {
    context.hotbarContainer.appendChild(
      createSlotElement(context, i, true, handleSlotClick),
    );
  }

  for (let i = 9; i < 36; i++) {
    context.inventoryGrid.appendChild(
      createSlotElement(context, i, false, handleSlotClick),
    );
  }

  const separator = document.createElement("div");
  separator.className = "slot-hotbar-separator";
  separator.style.gridColumn = "1 / -1";
  context.inventoryGrid.appendChild(separator);

  for (let i = 0; i < 9; i++) {
    context.inventoryGrid.appendChild(
      createSlotElement(context, i, false, handleSlotClick),
    );
  }
}
