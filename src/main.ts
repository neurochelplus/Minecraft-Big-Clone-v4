import { initToolTextures } from "./constants/ToolTextures";
import { GameInitializer } from "./initialization/GameInitializer";
import { LoadingScreen } from "./initialization/LoadingScreen";
import { NoiseGenerator } from "./initialization/NoiseGenerator";
import { AutoSave } from "./ui/AutoSave";
import { InventoryController } from "./ui/InventoryController";
import { KeyboardHandler } from "./input/KeyboardHandler";
import { MouseHandler } from "./input/MouseHandler";
import { PointerLockHandler } from "./input/PointerLockHandler";
import { Game } from "./core/Game";
import { getSurfaceSpawnPosition } from "./utils/SpawnUtils";
import "./style.css";

// Initialize Tool Textures
initToolTextures();

// Generate CSS Noise Texture
NoiseGenerator.generate();

// Initialize all game systems
const systems = GameInitializer.initialize();

// Create Game instance
const game = new Game(
  systems.gameRenderer,
  systems.gameState,
  systems.world,
  systems.environment,
  systems.entities,
  systems.mobManager,
  systems.player,
  systems.blockCursor,
  systems.blockBreaking,
  systems.blockInteraction,
  systems.inventory,
  systems.inventoryUI,
  systems.craftingSystem,
  systems.craftingUI,
  systems.furnaceUI,
  systems.furnaceManager,
);

// Set game reference for callbacks
systems.setGame(game);

// Inventory Controller
const inventoryController = new InventoryController(
  systems.controls,
  systems.player,
  systems.world,
  systems.inventory,
  systems.inventoryUI,
  systems.dragDrop,
  systems.craftingSystem,
  systems.craftingUI,
  systems.furnaceUI,
  systems.furnaceManager,
  systems.isMobile,
);

// Set interaction callbacks
systems.blockInteraction["onOpenCraftingTable"] = () =>
  inventoryController.toggle(true);
systems.blockInteraction["onOpenFurnace"] = (x: number, y: number, z: number) =>
  inventoryController.toggle("furnace", { x, y, z });

// Input Handlers
new KeyboardHandler(
  systems.gameState,
  systems.player,
  systems.inventory,
  systems.inventoryUI,
  game.cli,
  (useCraftingTable) => inventoryController.toggle(useCraftingTable),
  () => game.menus.showPauseMenu(),
  () => {
    if (systems.inventoryUI.onInventoryChange) {
      systems.inventoryUI.onInventoryChange();
    }
  },
);

const mouseHandler = new MouseHandler(
  systems.gameState,
  systems.player,
  systems.blockBreaking,
  systems.blockInteraction,
  systems.world,
  systems.inventory,
  systems.inventoryUI,
  systems.controls,
  systems.isMobile,
  () => {
    if (systems.inventoryUI.onInventoryChange) {
      systems.inventoryUI.onInventoryChange();
    }
  },
);

// Expose mouse handler state to game
game.isAttackPressed = false;
game.isUsePressed = false;
Object.defineProperty(game, "isAttackPressed", {
  get: () => mouseHandler.isAttackPressed,
  set: (val) => {
    mouseHandler.isAttackPressed = val;
  },
});
Object.defineProperty(game, "isUsePressed", {
  get: () => mouseHandler.isUsePressed,
  set: (val) => {
    mouseHandler.isUsePressed = val;
  },
});

new PointerLockHandler(
  systems.controls,
  systems.gameState,
  () => inventoryController.toggle(),
  () => game.menus.hidePauseMenu(),
  () => game.menus.showPauseMenu(),
  () => game.cli.isOpen,
);

// Auto-save
const autoSave = new AutoSave(
  systems.gameState,
  systems.world,
  systems.controls,
  systems.inventory,
  systems.furnaceManager,
);
autoSave.start();

// Mobile Events
window.addEventListener("toggle-inventory", () => inventoryController.toggle(false));
window.addEventListener("toggle-pause-menu", () => game.menus.togglePauseMenu());

// Loading Screen
const loadingScreen = new LoadingScreen();

// Load World Data
systems.world.loadWorld().then(async (data) => {
  const spawnX =
    data.playerPosition?.x ?? systems.controls.object.position.x;
  const spawnZ =
    data.playerPosition?.z ?? systems.controls.object.position.z;

  if (data.inventory) {
    systems.inventory.deserialize(data.inventory);
    systems.inventoryUI.refresh();
  }

  // Load Furnaces
  await systems.furnaceManager.load();

  // Ensure spawn chunk is loaded
  const cx = Math.floor(spawnX / 32);
  const cz = Math.floor(spawnZ / 32);
  await systems.world.waitForChunk(cx, cz);

  const safeSpawn = getSurfaceSpawnPosition(systems.world, spawnX, spawnZ);
  systems.controls.object.position.copy(safeSpawn);
});

// Start Loading Screen
loadingScreen.start(() => game.start());
