import type { IWorld } from "./world";

export interface IBlockBreaking {
  update(time: number, world: IWorld): void;
  isBreakingNow(): boolean;
  start(world: IWorld): void;
  stop(): void;
}

export interface IBlockInteraction {
  update(delta: number, isUsePressed: boolean): void;
  getIsEating(): boolean;
  interact(world: IWorld): void;
}

export interface IBlockCursor {
  update(world: IWorld): void;
}
