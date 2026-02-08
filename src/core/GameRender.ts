import type { Game } from "./Game";
import type { GameLoopState } from "./GameLoop";

export function renderGame(game: Game, loopState: GameLoopState): void {
  if (loopState.profilerEnabled && loopState.profiler) {
    loopState.profiler.startSection("render.clear", performance.now());
    game.renderer.clear();
    loopState.profiler.endSection("render.clear", performance.now());

    loopState.profiler.startSection("render.main", performance.now());
    game.renderer.renderMain();
    loopState.profiler.endSection("render.main", performance.now());

    loopState.profiler.startSection("render.ui", performance.now());
    game.renderer.clearDepth();
    game.renderer.renderUi();
    loopState.profiler.endSection("render.ui", performance.now());
    return;
  }

  game.renderer.render();
}
