import type { IControls } from "../contracts/controls";
import type { IPlayerInput } from "../contracts/player";
import type { IWorld } from "../contracts/world";
import type { IInventory } from "../contracts/inventory";
import type { IInventoryUI, IDragDrop, ICraftingUI, IFurnaceUI } from "../contracts/ui";
import type { ICrafting, IFurnaceManager } from "../contracts/crafting";
import type { SaveCoordinator } from "./SaveCoordinator";

/**
 * Controls inventory menu opening/closing and related UI state
 */
export class InventoryController {
  constructor(
    controls: IControls,
    player: IPlayerInput,
    world: IWorld,
    inventory: IInventory,
    inventoryUI: IInventoryUI,
    dragDrop: IDragDrop,
    craftingSystem: ICrafting,
    craftingUI: ICraftingUI,
    furnaceUI: IFurnaceUI,
    furnaceManager: IFurnaceManager,
    saveCoordinator: SaveCoordinator,
    isMobile: boolean,
  ) {
    this.controls = controls;
    this.player = player;
    this.world = world;
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
    this.dragDrop = dragDrop;
    this.craftingSystem = craftingSystem;
    this.craftingUI = craftingUI;
    this.furnaceUI = furnaceUI;
    this.furnaceManager = furnaceManager;
    this.saveCoordinator = saveCoordinator;
    this.isMobile = isMobile;
  }

  private controls: IControls;
  private player: IPlayerInput;
  private world: IWorld;
  private inventory: IInventory;
  private inventoryUI: IInventoryUI;
  private dragDrop: IDragDrop;
  private craftingSystem: ICrafting;
  private craftingUI: ICraftingUI;
  private furnaceUI: IFurnaceUI;
  private furnaceManager: IFurnaceManager;
  private saveCoordinator: SaveCoordinator;
  private isMobile: boolean;

  /**
   * Toggle inventory menu
   * @param param - false for normal inventory, true for crafting table, "furnace" for furnace
   * @param furnacePos - Position of furnace if opening furnace UI
   */
  toggle(
    param: boolean | "furnace" = false,
    furnacePos?: { x: number; y: number; z: number },
  ): void {
    const inventoryMenu = document.getElementById("inventory-menu")!;
    const crosshair = document.getElementById("crosshair")!;
    const isInventoryOpen = inventoryMenu.style.display === "flex";

    this.dragDrop.setInventoryOpen(!isInventoryOpen);

    if (!isInventoryOpen) {
      // Open inventory
      const useCraftingTable = param === true;
      const useFurnace = param === "furnace";

      // Stop Movement
      this.player.physics.moveForward = false;
      this.player.physics.moveBackward = false;
      this.player.physics.moveLeft = false;
      this.player.physics.moveRight = false;
      this.player.physics.isSprinting = false;

      inventoryMenu.style.display = "flex";
      crosshair.style.display = "none";

      // Unlock after inventory is visible to prevent pause menu from opening.
      this.controls.unlock();

      if (useFurnace && furnacePos) {
        this.furnaceUI.open(furnacePos.x, furnacePos.y, furnacePos.z);
        this.craftingUI.setVisible(false, false);
      } else {
        this.furnaceUI.close();
        this.craftingUI.setVisible(true, useCraftingTable);
      }

      if (this.isMobile) {
        const mobUi = document.getElementById("mobile-ui");
        if (mobUi) mobUi.style.display = "none";
      }

      this.inventoryUI.refresh();

      // Create close button if not exists
      if (!document.getElementById("btn-close-inv")) {
        const closeBtn = document.createElement("div");
        closeBtn.id = "btn-close-inv";
        closeBtn.innerText = "X";
        closeBtn.addEventListener("touchstart", (e) => {
          e.preventDefault();
          this.toggle();
        });
        closeBtn.addEventListener("click", () => this.toggle());
        inventoryMenu.appendChild(closeBtn);
      }
    } else {
      // Close inventory
      void this.saveCoordinator.requestSave("inventory-close");

      // Return items from crafting grid
      this.craftingSystem.consumeIngredients();
      for (let i = 0; i < 9; i++) {
        if (this.craftingSystem.craftingSlots[i].id !== 0) {
          this.inventory.addItem(
            this.craftingSystem.craftingSlots[i].id,
            this.craftingSystem.craftingSlots[i].count,
          );
          this.craftingSystem.craftingSlots[i].id = 0;
          this.craftingSystem.craftingSlots[i].count = 0;
        }
      }
      this.craftingSystem.craftingResult.id = 0;
      this.craftingSystem.craftingResult.count = 0;
      this.craftingUI.setVisible(false, false);
      this.furnaceUI.close();

      if (this.isMobile) {
        const mobUi = document.getElementById("mobile-ui");
        if (mobUi) mobUi.style.display = "block";
        document.getElementById("joystick-zone")!.style.display = "block";
        document.getElementById("mobile-actions")!.style.display = "flex";
      }

      this.controls.lock();
      inventoryMenu.style.display = "none";
      crosshair.style.display = "block";

      // Return dragged item to inventory
      const dragged = this.dragDrop.getDraggedItem();
      if (dragged) {
        this.inventory.addItem(dragged.id, dragged.count);
        this.dragDrop.setDraggedItem(null);
      }
    }
  }
}
