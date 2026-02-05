import type { IGameState } from "../contracts/gameState";
import type { IPlayerInput } from "../contracts/player";
import type { IInventory } from "../contracts/inventory";
import type { IInventoryUI } from "../contracts/ui";
import { CLI } from "../ui/CLI";

/**
 * Handles keyboard input for player movement and game controls
 */
export class KeyboardHandler {
  private gameState: IGameState;
  private player: IPlayerInput;
  private inventory: IInventory;
  private inventoryUI: IInventoryUI;
  private cli: CLI;
  private onToggleInventory: (useCraftingTable: boolean) => void;
  private onShowPauseMenu: () => void;
  private onHotbarChange: () => void;
  private onToggleProfiler: () => void;

  constructor(
    gameState: IGameState,
    player: IPlayerInput,
    inventory: IInventory,
    inventoryUI: IInventoryUI,
    cli: CLI,
    onToggleInventory: (useCraftingTable: boolean) => void,
    onShowPauseMenu: () => void,
    onHotbarChange: () => void,
    onToggleProfiler: () => void,
  ) {
    this.gameState = gameState;
    this.player = player;
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
    this.cli = cli;
    this.onToggleInventory = onToggleInventory;
    this.onShowPauseMenu = onShowPauseMenu;
    this.onHotbarChange = onHotbarChange;
    this.onToggleProfiler = onToggleProfiler;
    this.init();
  }

  private init(): void {
    document.addEventListener("keydown", (e) => this.onKeyDown(e));
    document.addEventListener("keyup", (e) => this.onKeyUp(e));
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // Hotbar number keys
    window.addEventListener("keydown", (event) => {
      const key = parseInt(event.key);
      if (key >= 1 && key <= 9) {
        this.inventory.setSelectedSlot(key - 1);
        this.inventoryUI.refresh();
        this.onHotbarChange();
      }
    });
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.cli.isOpen) return;

    const inventoryMenu = document.getElementById("inventory-menu")!;
    const isInventoryOpen = inventoryMenu.style.display === "flex";

    // Prevent movement keys when inventory is open
    if (isInventoryOpen) {
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowLeft",
          "ArrowDown",
          "ArrowRight",
          "Space",
        ].includes(event.code)
      ) {
        return;
      }
    }

    switch (event.code) {
      case "F3":
        event.preventDefault();
        this.onToggleProfiler();
        break;
      case "Slash":
        event.preventDefault();
        this.cli.toggle(true, "/");
        break;
      case "KeyT":
        if (
          !this.gameState.getPaused() &&
          this.gameState.getGameStarted() &&
          inventoryMenu.style.display !== "flex"
        ) {
          event.preventDefault();
          this.cli.toggle(true, "");
        }
        break;
      case "ArrowUp":
      case "KeyW":
        this.player.physics.moveForward = true;
        break;
      case "ArrowLeft":
      case "KeyA":
        this.player.physics.moveLeft = true;
        break;
      case "ArrowDown":
      case "KeyS":
        this.player.physics.moveBackward = true;
        break;
      case "ArrowRight":
      case "KeyD":
        this.player.physics.moveRight = true;
        break;
      case "ControlLeft":
      case "ControlRight":
        this.player.physics.isSprinting = !this.player.physics.isSprinting;
        break;
      case "Space":
        this.player.physics.jump();
        break;
      case "KeyE":
        if (!this.gameState.getPaused()) this.onToggleInventory(false);
        break;
      case "Escape":
        {
          const invMenu = document.getElementById("inventory-menu")!;
          if (invMenu.style.display === "flex") {
            this.onToggleInventory(false);
          } else if (this.gameState.getGameStarted()) {
            this.onShowPauseMenu();
          }
        }
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this.player.physics.moveForward = false;
        this.player.physics.isSprinting = false;
        break;
      case "ArrowLeft":
      case "KeyA":
        this.player.physics.moveLeft = false;
        break;
      case "ArrowDown":
      case "KeyS":
        this.player.physics.moveBackward = false;
        break;
      case "ArrowRight":
      case "KeyD":
        this.player.physics.moveRight = false;
        break;
    }
  }
}
