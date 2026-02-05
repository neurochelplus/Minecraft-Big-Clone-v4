import { BLOCK_NAMES } from "../../constants/BlockNames";
import type { InventoryUIContext } from "./types";

export function bindTooltipHandlers(
  slotElement: HTMLElement,
  index: number,
  context: InventoryUIContext,
): void {
  slotElement.addEventListener("mouseenter", () => {
    const slot = context.inventory.getSlot(index);
    if (context.inventoryMenu.style.display !== "none" && slot.id !== 0) {
      context.tooltip.innerText = BLOCK_NAMES[slot.id] || "Block";
      context.tooltip.style.display = "block";
    }
  });

  slotElement.addEventListener("mousemove", (event) => {
    if (context.inventoryMenu.style.display !== "none") {
      context.tooltip.style.left = `${event.clientX + 10}px`;
      context.tooltip.style.top = `${event.clientY + 10}px`;
    }
  });

  slotElement.addEventListener("mouseleave", () => {
    context.tooltip.style.display = "none";
  });
}
