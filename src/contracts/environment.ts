export interface IEnvironment {
  readonly isDay: boolean;
  setTimeToDay(): void;
  setTimeToNight(): void;
  setShadowsEnabled(enabled: boolean): void;
  setCloudsEnabled(enabled: boolean): void;
  update(delta: number, playerPos: { x: number; y: number; z: number }): void;
}
