export interface IGameState {
  getPaused(): boolean;
  setPaused(paused: boolean): void;
  getGameStarted(): boolean;
  setGameStarted(started: boolean): void;
  getIsResuming(): boolean;
  setIsResuming(resuming: boolean): void;
}
