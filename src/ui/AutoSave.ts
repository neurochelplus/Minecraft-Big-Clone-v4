import type { IGameState } from "../contracts/gameState";
import type { IWorld } from "../contracts/world";
import type { IInventory } from "../contracts/inventory";
import type { IFurnaceManager } from "../contracts/crafting";
import type { IControls } from "../contracts/controls";

/**
 * Handles automatic world saving every 30 seconds
 */
export class AutoSave {
  private intervalId: number | null = null;
  private readonly SAVE_INTERVAL = 30000; // 30 seconds
  private gameState: IGameState;
  private world: IWorld;
  private controls: IControls;
  private inventory: IInventory;
  private furnaceManager: IFurnaceManager;

  constructor(
    gameState: IGameState,
    world: IWorld,
    controls: IControls,
    inventory: IInventory,
    furnaceManager: IFurnaceManager,
  ) {
    this.gameState = gameState;
    this.world = world;
    this.controls = controls;
    this.inventory = inventory;
    this.furnaceManager = furnaceManager;
  }

  /**
   * Start auto-save timer
   */
  start(): void {
    this.intervalId = window.setInterval(() => {
      if (this.gameState.getGameStarted() && !this.gameState.getPaused()) {
        this.world.saveWorld({
          position: this.controls.object.position,
          inventory: this.inventory.serialize(),
        });
        this.furnaceManager.save();
      }
    }, this.SAVE_INTERVAL);
  }

  /**
   * Stop auto-save timer
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
