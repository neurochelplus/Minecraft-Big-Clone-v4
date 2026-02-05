import type { IControls } from "./controls";

export interface IPlayerInput {
  physics: {
    moveForward: boolean;
    moveBackward: boolean;
    moveLeft: boolean;
    moveRight: boolean;
    isSprinting: boolean;
    jump(): void;
    setInvertedControls(duration: number): void;
    controls: IControls;
  };
  combat: {
    performAttack(): void;
  };
  hand: {
    punch(): void;
    stopPunch(): void;
  };
}

export interface IPlayerRuntime {
  update(delta: number): void;
  physics: IPlayerInput["physics"];
  combat: IPlayerInput["combat"];
  hand: IPlayerInput["hand"] & {
    setEating(isEating: boolean): void;
    updateItem(id: number): void;
  };
  health: {
    takeDamage(damage: number): void;
    getHp(): number;
    setHp(hp: number): void;
  };
}
