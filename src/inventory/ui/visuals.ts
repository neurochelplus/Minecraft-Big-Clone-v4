import { TOOL_TEXTURES } from "../../constants/ToolTextures";
import { BLOCK } from "../../constants/Blocks";
import { getBlockColor } from "../../utils/BlockColors";
import type { InventoryUIContext } from "./types";

export function refreshInventory(context: InventoryUIContext): void {
  for (let i = 0; i < 36; i++) {
    updateSlotVisuals(context, i);
  }
}

export function updateSlotVisuals(context: InventoryUIContext, index: number): void {
  const slot = context.inventory.getSlot(index);
  const elements = document.querySelectorAll(`.slot[data-index="${index}"]`);

  elements.forEach((el) => {
    if (el.parentElement === context.hotbarContainer) {
      if (index === context.inventory.getSelectedSlot()) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    }

    const icon = el.querySelector(".block-icon") as HTMLElement;
    const countEl = el.querySelector(".slot-count") as HTMLElement;
    const durabilityEl = el.querySelector(".slot-durability") as HTMLElement;

    if (slot.id !== 0 && slot.count > 0) {
      icon.style.display = "block";

      icon.className = "block-icon";
      icon.style.backgroundImage = "";
      icon.style.backgroundColor = "";

      if (TOOL_TEXTURES[slot.id]) {
        icon.classList.add("item-tool");
        icon.style.backgroundImage = `url(${TOOL_TEXTURES[slot.id].dataUrl})`;
      } else if (slot.id === BLOCK.PLANKS) {
        icon.classList.add("item-planks");
        icon.style.backgroundColor = getBlockColor(slot.id);
      } else if (slot.id === BLOCK.CRAFTING_TABLE) {
        icon.style.backgroundColor = getBlockColor(slot.id);
        icon.style.backgroundImage = "var(--noise-url)";
      } else {
        icon.style.backgroundColor = getBlockColor(slot.id);
        icon.style.backgroundImage = "var(--noise-url)";
      }

      countEl.innerText = slot.count.toString();

      if (slot.durability !== undefined && slot.maxDurability !== undefined) {
        durabilityEl.style.display = "block";
        const percent = slot.durability / slot.maxDurability;
        durabilityEl.style.width = `${percent * 100}%`;

        if (percent > 0.5) durabilityEl.style.backgroundColor = "#00ff00";
        else if (percent > 0.2) durabilityEl.style.backgroundColor = "#ffff00";
        else durabilityEl.style.backgroundColor = "#ff0000";
      } else {
        durabilityEl.style.display = "none";
      }
    } else {
      icon.style.display = "none";
      countEl.innerText = "";
      durabilityEl.style.display = "none";
    }
  });
}
