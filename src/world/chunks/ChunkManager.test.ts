// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ChunkManager } from './ChunkManager';

// Define the mock instance
const mockChunkLoaderInstance = {
  init: vi.fn().mockResolvedValue(undefined),
  getChunks: vi.fn().mockReturnValue(new Map()),
  ensureChunk: vi.fn(),
  processGenerationQueue: vi.fn(),
  unloadChunk: vi.fn(),
  updateChunkSorting: vi.fn(),
  getChunksData: vi.fn().mockReturnValue(new Map()),
  getDirtyChunks: vi.fn().mockReturnValue(new Set()),
  getDB: vi.fn(),
  close: vi.fn(),
  getSeed: vi.fn(),
  setSeed: vi.fn(),
  getNoiseTexture: vi.fn(),
  getBlock: vi.fn(),
  setBlock: vi.fn(),
  hasBlock: vi.fn(),
  isChunkLoaded: vi.fn(),
  getTopY: vi.fn(),
  waitForChunk: vi.fn(),
  saveDirtyChunks: vi.fn(),
  clear: vi.fn(),
  clearMemory: vi.fn(),
};

// Mock dependencies using classes
vi.mock('./ChunkLoader', () => {
  return {
    ChunkLoader: class {
        constructor() {
            return mockChunkLoaderInstance;
        }
    }
  };
});

const mockChunkVisibilityInstance = {
  update: vi.fn(),
  clearBounds: vi.fn(),
  clearAll: vi.fn()
};

vi.mock('./ChunkVisibility', () => {
  return {
    ChunkVisibility: class {
        constructor() {
            return mockChunkVisibilityInstance;
        }
    }
  };
});

vi.mock('../../utils/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ChunkManager Performance', () => {
  let chunkManager: ChunkManager;
  let mockScene: THREE.Scene;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = new THREE.Scene();

    // We need to re-instantiate ChunkManager for each test
    chunkManager = new ChunkManager(mockScene);
  });

  it('should NOT iterate chunk radius on non-full updates (Performance)', () => {
    const playerPos = new THREE.Vector3(0, 0, 0);

    // 1. Initial update (Force full update because last pos is -Infinity)
    chunkManager.update(playerPos);

    // Expect ensures to be called for the radius
    expect(mockChunkLoaderInstance.ensureChunk).toHaveBeenCalled();
    const callsCount = mockChunkLoaderInstance.ensureChunk.mock.calls.length;
    // Radius 3 -> (2*3+1)^2 = 49 chunks
    expect(callsCount).toBeGreaterThanOrEqual(49);

    // Clear mocks to track next call
    mockChunkLoaderInstance.ensureChunk.mockClear();
    mockChunkLoaderInstance.processGenerationQueue.mockClear();

    // 2. Second update (No movement, counter incremented to 1)
    // updateCounter starts at 0.
    // update() -> counter++ (1). shouldFullUpdate = false.
    chunkManager.update(playerPos);

    // CRITICAL CHECK: ensureChunk should NOT be called if we optimized the loop.
    // IF THIS FAILS: It means the loop IS running (which is the current bug/inefficiency).
    expect(mockChunkLoaderInstance.ensureChunk).not.toHaveBeenCalled();

    // processGenerationQueue MUST still be called every frame
    expect(mockChunkLoaderInstance.processGenerationQueue).toHaveBeenCalled();
  });
});
