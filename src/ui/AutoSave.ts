import { GameState } from "../core/GameState";
import { AUTO_SAVE_INTERVAL } from "../constants/GameConstants";
import { SaveCoordinator } from "./SaveCoordinator";

export class AutoSave {
  private intervalId: number | null = null;
  private readonly SAVE_INTERVAL = AUTO_SAVE_INTERVAL;

  constructor(
    private gameState: GameState,
    private saveCoordinator: SaveCoordinator,
  ) {}

  public start(): void {
    this.intervalId = window.setInterval(() => {
      if (this.gameState.getGameStarted() && !this.gameState.getPaused()) {
        void this.saveCoordinator.requestSave("autosave");
      }
    }, this.SAVE_INTERVAL);
  }

  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
