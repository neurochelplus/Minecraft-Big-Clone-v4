import type { InventorySlot } from "../contracts/inventory";
import { TOOL_TEXTURES } from "../constants/ToolTextures";
import { BLOCK } from "../constants/Blocks";
import { getBlockColor } from "../utils/BlockColors";

export class DragDrop {
  private draggedItem: InventorySlot | null = null;
  private dragIcon: HTMLElement;
  private isInventoryOpen: boolean = false;

  constructor() {
    this.dragIcon = document.getElementById("drag-icon")!;
    if (!this.dragIcon) {
      console.warn("Drag icon element not found, creating one");
      this.dragIcon = document.createElement("div");
      this.dragIcon.id = "drag-icon";
      document.body.appendChild(this.dragIcon);
    }

    this.initEventListeners();
  }

  private initEventListeners() {
    window.addEventListener("mousemove", (e) => {
      if (this.draggedItem) {
        this.dragIcon.style.left = e.clientX + "px";
        this.dragIcon.style.top = e.clientY + "px";
      }
    });

    window.addEventListener(
      "touchmove",
      (e) => {
        if (this.draggedItem && this.isInventoryOpen) {
          const touch = e.changedTouches[0];
          this.dragIcon.style.left = touch.clientX + "px";
          this.dragIcon.style.top = touch.clientY + "px";
        }
      },
      { passive: false },
    );
  }

  public setInventoryOpen(isOpen: boolean) {
    this.isInventoryOpen = isOpen;
  }

  public getDraggedItem(): InventorySlot | null {
    return this.draggedItem;
  }

  public setDraggedItem(item: InventorySlot | null) {
    this.draggedItem = item ? { ...item } : null;
    this.updateDragIcon();
  }

  private updateDragIcon() {
    this.dragIcon.innerHTML = "";
    if (this.draggedItem && this.draggedItem.id !== 0) {
      this.dragIcon.style.display = "block";
      const icon = document.createElement("div");
      icon.className = "block-icon";
      icon.style.width = "32px";
      icon.style.height = "32px";

      // Reset styles
      icon.style.backgroundImage = "";
      icon.style.backgroundColor = "";
      icon.className = "block-icon"; // Reset classes

      if (TOOL_TEXTURES[this.draggedItem.id]) {
        icon.classList.add("item-tool");
        icon.style.backgroundImage = `url(${TOOL_TEXTURES[this.draggedItem.id].dataUrl})`;
      } else if (this.draggedItem.id === BLOCK.PLANKS) {
        icon.classList.add("item-planks");
        icon.style.backgroundColor = getBlockColor(this.draggedItem.id);
      } else if (this.draggedItem.id === BLOCK.CRAFTING_TABLE) {
        icon.style.backgroundColor = getBlockColor(this.draggedItem.id);
        icon.style.backgroundImage = "var(--noise-url)";
      } else {
        icon.style.backgroundColor = getBlockColor(this.draggedItem.id);
        icon.style.backgroundImage = "var(--noise-url)";
      }

      const count = document.createElement("div");
      count.className = "slot-count";
      count.style.fontSize = "12px";
      count.innerText = this.draggedItem.count.toString();

      icon.appendChild(count);
      this.dragIcon.appendChild(icon);
    } else {
      this.dragIcon.style.display = "none";
    }
  }
}
