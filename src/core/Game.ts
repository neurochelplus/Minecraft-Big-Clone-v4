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
import { FrameProfiler, ProfilerOverlay } from "../utils/Profiler";

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
  private profiler: FrameProfiler | null = null;
  private profilerOverlay: ProfilerOverlay | null = null;
  private profilerEnabled = false;
  private profilerUiEvery = 10;
  private profilerUiCounter = 0;

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

  public toggleProfiler(): void {
    if (!this.profiler) {
      this.profiler = new FrameProfiler({ sampleSize: 120, targetFps: 60 });
    }
    if (!this.profilerOverlay) {
      this.profilerOverlay = new ProfilerOverlay({ maxSections: 16 });
    }

    this.profilerEnabled = !this.profilerEnabled;
    this.profilerOverlay.setVisible(this.profilerEnabled);
    this.profilerUiCounter = 0;
  }

  /**
 * Главный класс игры, координирующий все системы
 */
  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const frameStart = performance.now();

    if (this.gameState.getPaused()) {
      this.renderer.renderOnlyMain();
      return;
    }

    if (this.profilerEnabled && this.profiler) {
      this.profiler.startFrame(frameStart);
      this.profiler.startSection("update", frameStart);
    }

    this.update();

    if (this.profilerEnabled && this.profiler) {
      const afterUpdate = performance.now();
      this.profiler.endSection("update", afterUpdate);
      this.profiler.startSection("render", afterUpdate);
    }

    this.render();

    if (this.profilerEnabled && this.profiler) {
      const frameEnd = performance.now();
      this.profiler.endSection("render", frameEnd);
      this.profiler.endFrame(frameEnd);

      this.profilerUiCounter += 1;
      if (this.profilerOverlay && this.profilerUiCounter >= this.profilerUiEvery) {
        this.profilerUiCounter = 0;
        this.profilerOverlay.update(this.profiler.getStats());
      }
    }
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
    const profiler = this.profilerEnabled ? this.profiler : null;
    const sectionStart = (name: string) => {
      if (profiler) profiler.startSection(name, performance.now());
    };
    const sectionEnd = (name: string) => {
      if (profiler) profiler.endSection(name, performance.now());
    };

    // IWorld & Environment
    sectionStart("world.update");
    this.world.update(this.renderer.controls.object.position);
    sectionEnd("world.update");

    sectionStart("environment.update");
    this.environment.update(delta, this.renderer.controls.object.position);
    sectionEnd("environment.update");

    sectionStart("furnace.tick");
    this.furnaceManager.tick(delta);
    sectionEnd("furnace.tick");

    if (this.furnaceUI.isVisible()) {
      sectionStart("furnace.ui");
      this.furnaceUI.updateVisuals();
      sectionEnd("furnace.ui");
    }

    // Player Update (Physics & Hand)

    // Player Update (Physics & Hand)
    sectionStart("player.update");
    this.player.update(delta);
    sectionEnd("player.update");

    // Block Breaking
    sectionStart("blocks.breaking");
    this.blockBreaking.update(time, this.world);
    sectionEnd("blocks.breaking");

    // Attack / Mining
    if (this.isAttackPressed && this.gameState.getGameStarted()) {
      sectionStart("blocks.attack");
      if (!this.blockBreaking.isBreakingNow())
        this.blockBreaking.start(this.world);
      this.player.combat.performAttack();
      sectionEnd("blocks.attack");
    }

    // Interaction / Eating
    if (this.gameState.getGameStarted()) {
        sectionStart("blocks.interaction");
        this.blockInteraction.update(delta, this.isUsePressed);
        this.player.hand.setEating(this.blockInteraction.getIsEating());
        sectionEnd("blocks.interaction");
    }

    // Entities
    sectionStart("entities.update");
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
    sectionEnd("entities.update");

    // Mobs
    sectionStart("mobs.update");
    this.mobManager.update(
      delta,
      this.player, // Pass full player object
      this.environment,
      (amt) => this.player.health.takeDamage(amt),
    );
    sectionEnd("mobs.update");

    // Cursor
    if (this.gameState.getGameStarted()) {
      sectionStart("blocks.cursor");
      this.blockCursor.update(this.world);
      sectionEnd("blocks.cursor");
    }

    this.prevTime = time;
  }

  private render(): void {
    if (this.profilerEnabled && this.profiler) {
      this.profiler.startSection("render.clear", performance.now());
      this.renderer.clear();
      this.profiler.endSection("render.clear", performance.now());

      this.profiler.startSection("render.main", performance.now());
      this.renderer.renderMain();
      this.profiler.endSection("render.main", performance.now());

      this.profiler.startSection("render.ui", performance.now());
      this.renderer.clearDepth();
      this.renderer.renderUi();
      this.profiler.endSection("render.ui", performance.now());
      return;
    }

    this.renderer.render();
  }
}
