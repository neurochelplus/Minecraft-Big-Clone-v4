import { Renderer } from "./Renderer";
import type { IWorld } from "../contracts/world";
import type { IEnvironment } from "../contracts/environment";
import type { IGameState } from "../contracts/gameState";
import { ItemEntity } from "../entities/ItemEntity";
import type { IMobManager } from "../contracts/mobs";
import type { IBlockCursor, IBlockBreaking, IBlockInteraction } from "../contracts/blocks";
import type { IInventory } from "../contracts/inventory";
import type { IPlayerRuntime } from "../contracts/player";
import type { ICrafting, IFurnaceManager } from "../contracts/crafting";
import type { IInventoryUI, ICraftingUI, IFurnaceUI } from "../contracts/ui";
import { MobileControls } from "../mobile/MobileControls";
import { CLI } from "../ui/CLI";
import { Menus } from "../ui/Menus";
import { GameLoop } from "./GameLoop";
import { handleToolUse } from "./GameToolUse";

/**
 * Главный класс игры, координирующий все системы
 */
export class Game {
  [x: string]: unknown;
  public renderer: Renderer;
  public gameState: IGameState;
  public world: IWorld;
  public environment: IEnvironment;
  public entities: ItemEntity[];
  public mobManager: IMobManager;
  public player: IPlayerRuntime;
  public blockCursor: IBlockCursor;
  public blockBreaking: IBlockBreaking;
  public blockInteraction: IBlockInteraction;
  public inventory: IInventory;
  public inventoryUI: IInventoryUI;
  public craftingSystem: ICrafting;
  public craftingUI: ICraftingUI;
  public furnaceUI: IFurnaceUI;
  public furnaceManager: IFurnaceManager;
  public mobileControls: MobileControls | null = null;
  public cli: CLI;
  public menus: Menus;

  public isAttackPressed: boolean = false;
  public isUsePressed: boolean = false;

  private loop: GameLoop;

  constructor(
    renderer: Renderer,
    gameState: IGameState,
    world: IWorld,
    environment: IEnvironment,
    entities: ItemEntity[],
    mobManager: IMobManager,
    player: IPlayerRuntime,
    blockCursor: IBlockCursor,
    blockBreaking: IBlockBreaking,
    blockInteraction: IBlockInteraction,
    inventory: IInventory,
    inventoryUI: IInventoryUI,
    craftingSystem: ICrafting,
    craftingUI: ICraftingUI,
    furnaceUI: IFurnaceUI,
    furnaceManager: IFurnaceManager,
  ) {
    this.renderer = renderer;
    this.gameState = gameState;
    this.world = world;
    this.environment = environment;
    this.entities = entities;
    this.mobManager = mobManager;
    this.player = player;
    // Inject handleToolUse into Player (since we construct Player outside in main.ts usually, wait...
    // Game constructor receives Player. So Player is already created.
    // We need to pass handleToolUse to Player constructor in main.ts.
    // Or we can assign it here if Player has a setter or public field.
    // But PlayerCombat is created in Player constructor.
    // Let's check main.ts.

    this.blockCursor = blockCursor;
    this.blockBreaking = blockBreaking;
    this.blockInteraction = blockInteraction;
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
    this.craftingSystem = craftingSystem;
    this.craftingUI = craftingUI;
    this.furnaceUI = furnaceUI;
    this.furnaceManager = furnaceManager;

    // UI Systems
    this.cli = new CLI(this);
    this.menus = new Menus(this);

    // Initialize Mobile Controls if needed
    if (this.renderer.getIsMobile()) {
      this.mobileControls = new MobileControls(this);
    }

    this.loop = new GameLoop(this);
  }

  /**
 * Главный класс игры, координирующий все системы
 */
  public start(): void {
    this.loop.start();
  }

  /**
 * Главный класс игры, координирующий все системы
 */
  public stop(): void {
    this.loop.stop();
  }

  public resetTime(): void {
    this.loop.resetTime();
  }

  public toggleProfiler(): void {
    this.loop.toggleProfiler();
  }

  /**
 * Главный класс игры, координирующий все системы
 */
  public handleToolUse = (amount: number): void => {
    handleToolUse(this, amount);
  };
}
