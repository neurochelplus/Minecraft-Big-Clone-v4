import type { IWorld } from "./world";
import type { IInventory } from "./inventory";
import type { IPlayerRuntime } from "./player";
import type { IGameState } from "./gameState";
import type { IInventoryUI } from "./ui";
import type { IControls } from "./controls";
import type { IFurnaceManager } from "./crafting";

export interface IGameRuntime {
  renderer: {
    controls: IControls;
    camera: {
      rotation: { x: number };
    };
    getIsMobile(): boolean;
  };
  gameState: IGameState;
  world: IWorld;
  environment: {
    setShadowsEnabled(enabled: boolean): void;
    setCloudsEnabled(enabled: boolean): void;
  };
  inventory: IInventory;
  inventoryUI: IInventoryUI;
  furnaceManager: IFurnaceManager;
  player: IPlayerRuntime;
  blockBreaking: {
    start(world: IWorld): void;
    stop(): void;
  };
  blockInteraction: {
    interact(world: IWorld): void;
  };
  isAttackPressed: boolean;
  isUsePressed: boolean;
  resetTime(): void;
}
