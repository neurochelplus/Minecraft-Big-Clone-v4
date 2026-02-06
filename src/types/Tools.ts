/**
 * Типы для инструментов и их определений
 */

export interface ToolDefinition {
  pattern: string[];
  color?: string;
}

export interface ToolTextureData {
  texture: CanvasTexture;
  dataUrl: string;
}
import type { CanvasTexture } from "three";
