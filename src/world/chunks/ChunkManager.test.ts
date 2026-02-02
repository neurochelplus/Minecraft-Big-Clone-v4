// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChunkManager } from './ChunkManager';
import * as THREE from 'three';

// Define mocks instances
const mockLoaderInstance = {
  init: vi.fn(),
  getChunks: vi.fn().mockReturnValue(new Map()),
  ensureChunk: vi.fn(),
  processGenerationQueue: vi.fn(),
  unloadChunk: vi.fn(),
  updateChunkSorting: vi.fn(),
  getChunksData: vi.fn().mockReturnValue(new Map()),
  getDirtyChunks: vi.fn().mockReturnValue(new Set()),
  clearMemory: vi.fn(),
  getSeed: vi.fn(),
  setSeed: vi.fn(),
  getNoiseTexture: vi.fn(),
  getDB: vi.fn(),
  close: vi.fn(),
};

const mockVisibilityInstance = {
  update: vi.fn(),
  clearBounds: vi.fn(),
  clearAll: vi.fn(),
};

// Mock modules
vi.mock('./ChunkLoader', () => {
  return {
    ChunkLoader: class {
        constructor() {
            return mockLoaderInstance;
        }
    }
  };
});

vi.mock('./ChunkVisibility', () => {
  return {
    ChunkVisibility: class {
        constructor() {
            return mockVisibilityInstance;
        }
    }
  };
});

vi.mock('../../utils/Logger');

describe('ChunkManager Performance Optimization', () => {
  let chunkManager: ChunkManager;
  let mockScene: THREE.Scene;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = new THREE.Scene();

    // Reset return values if needed
    mockLoaderInstance.getChunks.mockReturnValue(new Map());
    mockLoaderInstance.getChunksData.mockReturnValue(new Map());

    // Mock window.__profiler
    (window as any).__profiler = {
      startMeasure: vi.fn(),
      endMeasure: vi.fn(),
    };

    chunkManager = new ChunkManager(mockScene);
  });

  afterEach(() => {
    delete (window as any).__profiler;
  });

  it('should call ensureChunk ONLY when shouldFullUpdate is true (optimized)', () => {
    const playerPos = new THREE.Vector3(0, 0, 0);

    // Frame 1
    // First update always triggers shouldFullUpdate because lastPlayerChunkX/Z are -Infinity
    chunkManager.update(playerPos);

    // Check calls to ensureChunk
    // Radius is 3, so (2*3+1)^2 = 49 chunks.
    expect(mockLoaderInstance.ensureChunk).toHaveBeenCalledTimes(49);

    // Reset mocks for Frame 2
    mockLoaderInstance.ensureChunk.mockClear();

    // Frame 2
    // Player hasn't moved. updateCounter increments to 1 (started at 0 after reset).
    chunkManager.update(playerPos);

    // In OPTIMIZED version, this loop should NOT run.
    expect(mockLoaderInstance.ensureChunk).toHaveBeenCalledTimes(0);

    // Frame 3
    // updateCounter increments to 2.
    chunkManager.update(playerPos);
    expect(mockLoaderInstance.ensureChunk).toHaveBeenCalledTimes(0);

    // Frame 4
    // updateCounter increments to 3. shouldFullUpdate becomes true.
    chunkManager.update(playerPos);
    expect(mockLoaderInstance.ensureChunk).toHaveBeenCalledTimes(49);
  });
});
