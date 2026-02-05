import { BLOCK } from "../constants/Blocks";
import { TOOL_DURABILITY } from "../constants/GameConstants";
import type { Game } from "./Game";

export function handleToolUse(game: Game, amount: number): void {
  const slotIndex = game.inventory.getSelectedSlot();
  const slot = game.inventory.getSlot(slotIndex);

  if (slot.id >= 20 && slot.id < 40) {
    if (slot.durability === undefined) {
      let max = 60;
      if (
        slot.id === BLOCK.STONE_SWORD ||
        slot.id === BLOCK.STONE_PICKAXE ||
        slot.id === BLOCK.STONE_AXE ||
        slot.id === BLOCK.STONE_SHOVEL
      ) {
        max = TOOL_DURABILITY.STONE;
      } else if (
        slot.id === BLOCK.IRON_SWORD ||
        slot.id === BLOCK.IRON_PICKAXE ||
        slot.id === BLOCK.IRON_AXE ||
        slot.id === BLOCK.IRON_SHOVEL
      ) {
        max = TOOL_DURABILITY.IRON;
      } else if (
        slot.id === BLOCK.WOODEN_SWORD ||
        slot.id === BLOCK.WOODEN_PICKAXE ||
        slot.id === BLOCK.WOODEN_AXE ||
        slot.id === BLOCK.WOODEN_SHOVEL
      ) {
        max = TOOL_DURABILITY.WOOD;
      }

      slot.maxDurability = max;
      slot.durability = max;
    }

    slot.durability -= amount;

    if (slot.durability <= 0) {
      game.inventory.setSlot(slotIndex, { id: 0, count: 0 });
    } else {
      game.inventory.setSlot(slotIndex, slot);
    }

    game.inventoryUI.refresh();
    if (game.inventoryUI.onInventoryChange) {
      game.inventoryUI.onInventoryChange();
    }
  }
}
