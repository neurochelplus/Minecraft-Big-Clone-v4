/// <reference lib="webworker" />
/**
 * Web Worker for chunk generation.
 * Uses shared runtime implementation to keep sync/worker results identical.
 */

import { generateChunkData } from "../generation/runtime/GenerateChunk";

interface GenerateMessage {
  type: "generate";
  id: number;
  cx: number;
  cz: number;
  seed: number;
  presetId: string;
  chunkSize: number;
  chunkHeight: number;
}

interface ResultMessage {
  type: "result";
  id: number;
  cx: number;
  cz: number;
  data: Uint8Array;
}

self.onmessage = (event: MessageEvent<GenerateMessage>) => {
  const message = event.data;
  if (message.type !== "generate") {
    return;
  }

  const data = generateChunkData({
    seed: message.seed,
    presetId: message.presetId,
    chunkSize: message.chunkSize,
    chunkHeight: message.chunkHeight,
    cx: message.cx,
    cz: message.cz,
  });

  const result: ResultMessage = {
    type: "result",
    id: message.id,
    cx: message.cx,
    cz: message.cz,
    data,
  };

  self.postMessage(result, [data.buffer]);
};

self.postMessage({ type: "ready" });
