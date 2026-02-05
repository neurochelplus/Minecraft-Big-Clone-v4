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
import { BLOCK } from "../constants/Blocks";
import { TOOL_DURABILITY } from "../constants/GameConstants";

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
  private furnaceManager: IFurnaceManager;
  public mobileControls: MobileControls | null = null;
  public cli: CLI;
  public menus: Menus;

  public isAttackPressed: boolean = false;
  public isUsePressed: boolean = false;

  private prevTime: number = performance.now();
  private animationId: number | null = null;

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
  }

  /**
 * Главный класс игры, координирующий все системы
 */
  public start(): void {
    if (this.animationId !== null) {
      return; // Already started
    }

    // Show Main Menu initially
    this.menus.showMainMenu();

    this.prevTime = performance.now();
    this.animate();
  }

  /**
 * Главный класс игры, координирующий все системы
 */
  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public resetTime(): void {
    this.prevTime = performance.now();
  }

  /**
 * Главный класс игры, координирующий все системы
 */
  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.gameState.getPaused()) {
      this.renderer.renderOnlyMain();
      return;
    }

    this.update();
    this.render();
  };

  /**
 * Главный класс игры, координирующий все системы
 */
  public handleToolUse = (amount: number): void => {
    const slotIndex = this.inventory.getSelectedSlot();
    const slot = this.inventory.getSlot(slotIndex);

    if (slot.id >= 20 && slot.id < 40) {
      // Initialize durability if missing
      if (slot.durability === undefined) {
        let max = 60; // Default Wood
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
        // Break tool
        this.inventory.setSlot(slotIndex, { id: 0, count: 0 });
        // Play sound?
      } else {
        this.inventory.setSlot(slotIndex, slot);
      }
      
      this.inventoryUI.refresh();
      if (this.inventoryUI.onInventoryChange)
        this.inventoryUI.onInventoryChange();
    }
  };

  private update(): void {
    const time = performance.now();
    const delta = (time - this.prevTime) / 1000;

    // IWorld & Environment
    this.world.update(this.renderer.controls.object.position);
    this.environment.update(delta, this.renderer.controls.object.position);
    this.furnaceManager.tick(delta);
    if (this.furnaceUI.isVisible()) {
      this.furnaceUI.updateVisuals();
    }

    // Player Update (Physics & Hand)

    // Player Update (Physics & Hand)
    this.player.update(delta);

    // Block Breaking
    this.blockBreaking.update(time, this.world);

    // Attack / Mining
    if (this.isAttackPressed && this.gameState.getGameStarted()) {
      if (!this.blockBreaking.isBreakingNow())
        this.blockBreaking.start(this.world);
      this.player.combat.performAttack();
    }

    // Interaction / Eating
    if (this.gameState.getGameStarted()) {
        this.blockInteraction.update(delta, this.isUsePressed);
        this.player.hand.setEating(this.blockInteraction.getIsEating());
    }

    // Entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      entity.update(time / 1000, delta);

      if (entity.isDead) {
        this.entities.splice(i, 1);
        continue;
      }

      if (
        entity.mesh.position.distanceTo(
          this.renderer.controls.object.position,
        ) < 2.5
      ) {
        // Pickup logic
        const remaining = this.inventory.addItem(entity.type, entity.count);
        entity.count = remaining;

        if (remaining === 0) {
          entity.dispose();
          this.entities.splice(i, 1);
        }

        this.inventoryUI.refresh();
        if (this.inventoryUI.onInventoryChange)
          this.inventoryUI.onInventoryChange();
      }
    }

    // Mobs
    this.mobManager.update(
      delta,
      this.player, // Pass full player object
      this.environment,
      (amt) => this.player.health.takeDamage(amt),
    );

    // Cursor
    if (this.gameState.getGameStarted()) {
      this.blockCursor.update(this.world);
    }

    this.prevTime = time;
  }

  private render(): void {
    this.renderer.render();
  }
}
