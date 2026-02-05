import type { Game } from "./Game";
import type { GameLoopState } from "./GameLoop";

export function updateGame(game: Game, loopState: GameLoopState): void {
  const time = performance.now();
  const delta = (time - loopState.prevTime) / 1000;
  const profiler = loopState.profilerEnabled ? loopState.profiler : null;
  const sectionStart = (name: string) => {
    if (profiler) profiler.startSection(name, performance.now());
  };
  const sectionEnd = (name: string) => {
    if (profiler) profiler.endSection(name, performance.now());
  };

  sectionStart("world.update");
  game.renderer.controls.getDirection(loopState.viewDir);
  game.world.update(
    game.renderer.controls.object.position,
    loopState.viewDir,
    profiler ?? undefined,
  );
  sectionEnd("world.update");

  sectionStart("environment.update");
  game.environment.update(delta, game.renderer.controls.object.position);
  sectionEnd("environment.update");

  sectionStart("furnace.tick");
  game.furnaceManager.tick(delta);
  sectionEnd("furnace.tick");

  if (game.furnaceUI.isVisible()) {
    sectionStart("furnace.ui");
    game.furnaceUI.updateVisuals();
    sectionEnd("furnace.ui");
  }

  sectionStart("player.update");
  game.player.update(delta);
  sectionEnd("player.update");

  sectionStart("blocks.breaking");
  game.blockBreaking.update(time, game.world);
  sectionEnd("blocks.breaking");

  if (game.isAttackPressed && game.gameState.getGameStarted()) {
    sectionStart("blocks.attack");
    if (!game.blockBreaking.isBreakingNow()) {
      game.blockBreaking.start(game.world);
    }
    game.player.combat.performAttack();
    sectionEnd("blocks.attack");
  }

  if (game.gameState.getGameStarted()) {
    sectionStart("blocks.interaction");
    game.blockInteraction.update(delta, game.isUsePressed);
    game.player.hand.setEating(game.blockInteraction.getIsEating());
    sectionEnd("blocks.interaction");
  }

  sectionStart("entities.update");
  for (let i = game.entities.length - 1; i >= 0; i--) {
    const entity = game.entities[i];
    entity.update(time / 1000, delta);

    if (entity.isDead) {
      game.entities.splice(i, 1);
      continue;
    }

    if (
      entity.mesh.position.distanceTo(game.renderer.controls.object.position) <
      2.5
    ) {
      const remaining = game.inventory.addItem(entity.type, entity.count);
      entity.count = remaining;

      if (remaining === 0) {
        entity.dispose();
        game.entities.splice(i, 1);
      }

      game.inventoryUI.refresh();
      if (game.inventoryUI.onInventoryChange) {
        game.inventoryUI.onInventoryChange();
      }
    }
  }
  sectionEnd("entities.update");

  sectionStart("mobs.update");
  game.mobManager.update(
    delta,
    game.player,
    game.environment,
    (amt) => game.player.health.takeDamage(amt),
  );
  sectionEnd("mobs.update");

  if (game.gameState.getGameStarted()) {
    sectionStart("blocks.cursor");
    game.blockCursor.update(game.world);
    sectionEnd("blocks.cursor");
  }

  loopState.prevTime = time;
}
