import type { IGameState } from "../contracts/gameState";
import type { IPlayerInput } from "../contracts/player";
import type { IBlockBreaking, IBlockInteraction } from "../contracts/blocks";
import type { IWorld } from "../contracts/world";
import type { IInventory } from "../contracts/inventory";
import type { IInventoryUI } from "../contracts/ui";
import type { IControls } from "../contracts/controls";

/**
 * Handles mouse input for attacking, placing blocks, and hotbar scrolling
 */
export class MouseHandler {
  public isAttackPressed = false;
  public isUsePressed = false;
  private gameState: IGameState;
  private player: IPlayerInput;
  private blockBreaking: IBlockBreaking;
  private blockInteraction: IBlockInteraction;
  private world: IWorld;
  private inventory: IInventory;
  private inventoryUI: IInventoryUI;
  private controls: IControls;
  private isMobile: boolean;
  private onHotbarChange: () => void;

  constructor(
    gameState: IGameState,
    player: IPlayerInput,
    blockBreaking: IBlockBreaking,
    blockInteraction: IBlockInteraction,
    world: IWorld,
    inventory: IInventory,
    inventoryUI: IInventoryUI,
    controls: IControls,
    isMobile: boolean,
    onHotbarChange: () => void,
  ) {
    this.gameState = gameState;
    this.player = player;
    this.blockBreaking = blockBreaking;
    this.blockInteraction = blockInteraction;
    this.world = world;
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
    this.controls = controls;
    this.isMobile = isMobile;
    this.onHotbarChange = onHotbarChange;
    this.init();
  }

  private init(): void {
    document.addEventListener("mousedown", (e) => this.onMouseDown(e));
    document.addEventListener("mouseup", () => this.onMouseUp());

    // Hotbar scroll
    window.addEventListener("wheel", (event) => {
      let selected = this.inventory.getSelectedSlot();
      if (event.deltaY > 0) selected = (selected + 1) % 9;
      else selected = (selected - 1 + 9) % 9;
      this.inventory.setSelectedSlot(selected);
      this.inventoryUI.refresh();
      this.onHotbarChange();
    });
  }

  private onMouseDown(event: MouseEvent): void {
    if (this.gameState.getPaused() || !this.gameState.getGameStarted()) return;

    const invMenu = document.getElementById("inventory-menu")!;
    if (invMenu.style.display === "flex") return;

    // Click-to-lock fallback
    if (!this.controls.isLocked && !this.isMobile) {
      this.controls.lock();
      return;
    }

    if (event.button === 0) {
      // Left click - Attack
      this.isAttackPressed = true;
      this.player.hand.punch();
      this.player.combat.performAttack();
      this.blockBreaking.start(this.world);
    } else if (event.button === 2) {
      // Right click - Interact
      this.isUsePressed = true;
      this.blockInteraction.interact(this.world);
    }
  }

  private onMouseUp(): void {
    this.isAttackPressed = false;
    this.isUsePressed = false;
    this.player.hand.stopPunch();
    this.blockBreaking.stop();
  }
}
