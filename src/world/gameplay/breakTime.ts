import { BLOCK } from "../../constants/Blocks";

export function getBreakTime(blockType: number, toolId: number = 0): number {
  let time = 1000;

  switch (blockType) {
    case BLOCK.GRASS:
    case BLOCK.DIRT:
    case BLOCK.SAND:
    case BLOCK.SNOW:
    case BLOCK.SNOW_GRASS:
      if (toolId === BLOCK.IRON_SHOVEL) time = 100;
      else if (toolId === BLOCK.STONE_SHOVEL) time = 200;
      else if (toolId === BLOCK.WOODEN_SHOVEL) time = 400;
      else time = 750;
      break;

    case BLOCK.STONE:
    case BLOCK.FURNACE:
    case BLOCK.SANDSTONE:
    case BLOCK.ICE:
      if (toolId === BLOCK.IRON_PICKAXE) time = 400;
      else if (toolId === BLOCK.STONE_PICKAXE) time = 600;
      else if (toolId === BLOCK.WOODEN_PICKAXE) time = 1150;
      else time = 7500;
      break;

    case BLOCK.IRON_ORE:
      if (toolId === BLOCK.IRON_PICKAXE) time = 800;
      else if (toolId === BLOCK.STONE_PICKAXE) time = 1150;
      else if (toolId === BLOCK.WOODEN_PICKAXE) time = 7500;
      else time = 15000;
      break;

    case BLOCK.COAL_ORE:
      if (toolId === BLOCK.IRON_PICKAXE) time = 800;
      else if (toolId === BLOCK.STONE_PICKAXE) time = 1150;
      else if (toolId === BLOCK.WOODEN_PICKAXE) time = 2250;
      else time = 15000;
      break;

    case BLOCK.LEAVES:
      time = 500;
      break;

    case BLOCK.WOOD:
    case BLOCK.PLANKS: {
      let multiplier = 1;
      if (
        toolId === BLOCK.WOODEN_AXE ||
        toolId === BLOCK.STONE_AXE ||
        toolId === BLOCK.IRON_AXE
      ) {
        if (toolId === BLOCK.IRON_AXE) multiplier = 8;
        else if (toolId === BLOCK.STONE_AXE) multiplier = 4;
        else multiplier = 2;
      }
      time = 3000 / multiplier;
      break;
    }

    case BLOCK.BEDROCK:
      return Infinity;

    default:
      time = 1000;
      break;
  }

  return time;
}
