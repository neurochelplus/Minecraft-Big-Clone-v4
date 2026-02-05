import * as THREE from "three";
import { FrameProfiler, ProfilerOverlay } from "../utils/Profiler";
import type { Game } from "./Game";
import { updateGame } from "./GameUpdate";
import { renderGame } from "./GameRender";

export type GameLoopState = {
  prevTime: number;
  animationId: number | null;
  profiler: FrameProfiler | null;
  profilerOverlay: ProfilerOverlay | null;
  profilerEnabled: boolean;
  profilerUiEvery: number;
  profilerUiCounter: number;
  viewDir: THREE.Vector3;
};

export class GameLoop {
  private game: Game;
  private state: GameLoopState;

  constructor(game: Game) {
    this.game = game;
    this.state = {
      prevTime: performance.now(),
      animationId: null,
      profiler: null,
      profilerOverlay: null,
      profilerEnabled: false,
      profilerUiEvery: 10,
      profilerUiCounter: 0,
      viewDir: new THREE.Vector3(),
    };
  }

  public start(): void {
    if (this.state.animationId !== null) {
      return;
    }

    this.game.menus.showMainMenu();

    this.state.prevTime = performance.now();
    this.animate();
  }

  public stop(): void {
    if (this.state.animationId !== null) {
      cancelAnimationFrame(this.state.animationId);
      this.state.animationId = null;
    }
  }

  public resetTime(): void {
    this.state.prevTime = performance.now();
  }

  public toggleProfiler(): void {
    if (!this.state.profiler) {
      this.state.profiler = new FrameProfiler({ sampleSize: 120, targetFps: 60 });
    }
    if (!this.state.profilerOverlay) {
      this.state.profilerOverlay = new ProfilerOverlay({ maxSections: 16 });
    }

    this.state.profilerEnabled = !this.state.profilerEnabled;
    this.state.profilerOverlay.setVisible(this.state.profilerEnabled);
    this.state.profilerUiCounter = 0;
  }

  private animate = (): void => {
    this.state.animationId = requestAnimationFrame(this.animate);
    const frameStart = performance.now();

    if (this.game.gameState.getPaused()) {
      this.game.renderer.renderOnlyMain();
      return;
    }

    if (this.state.profilerEnabled && this.state.profiler) {
      this.state.profiler.startFrame(frameStart);
      this.state.profiler.startSection("update", frameStart);
    }

    updateGame(this.game, this.state);

    if (this.state.profilerEnabled && this.state.profiler) {
      const afterUpdate = performance.now();
      this.state.profiler.endSection("update", afterUpdate);
      this.state.profiler.startSection("render", afterUpdate);
    }

    renderGame(this.game, this.state);

    if (this.state.profilerEnabled && this.state.profiler) {
      const frameEnd = performance.now();
      this.state.profiler.endSection("render", frameEnd);
      this.state.profiler.endFrame(frameEnd);

      this.state.profilerUiCounter += 1;
      if (
        this.state.profilerOverlay &&
        this.state.profilerUiCounter >= this.state.profilerUiEvery
      ) {
        this.state.profilerUiCounter = 0;
        this.state.profilerOverlay.update(this.state.profiler.getStats());
      }
    }
  };
}
