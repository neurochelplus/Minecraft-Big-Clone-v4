// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChunkManager } from './ChunkManager';
import * as THREE from 'three';
import { WORLD_GENERATION } from '../../constants/WorldConstants';

// Mock ChunkLoader
vi.mock('./ChunkLoader', () => {
  return {
    ChunkLoader: vi.fn().mockImplementation(function() {
      return {
        init: vi.fn(),
        getChunks: vi.fn().mockReturnValue(new Map()),
        ensureChunk: vi.fn(),
        processGenerationQueue: vi.fn(),
        unloadChunk: vi.fn(),
        updateChunkSorting: vi.fn(),
        getDirtyChunks: vi.fn().mockReturnValue(new Set()),
        getChunksData: vi.fn().mockReturnValue(new Map()),
        close: vi.fn(),
      };
    })
  };
});

// Mock ChunkVisibility
vi.mock('./ChunkVisibility', () => {
  return {
    ChunkVisibility: vi.fn().mockImplementation(function() {
      return {
        update: vi.fn(),
        clearBounds: vi.fn(),
        clearAll: vi.fn(),
      };
    })
  };
});

// Mock window.__profiler
window.__profiler = {
  startMeasure: vi.fn(),
  endMeasure: vi.fn(),
};

describe('ChunkManager Performance', () => {
  let chunkManager: ChunkManager;
  let mockScene: THREE.Scene;
  let loaderMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = new THREE.Scene();
    chunkManager = new ChunkManager(mockScene);
    // Access the mocked loader instance
    loaderMock = (chunkManager as any).loader;
  });

  it('should only call ensureChunk when shouldFullUpdate is true (optimized)', () => {
    const playerPos = new THREE.Vector3(0, 0, 0);
    const radius = WORLD_GENERATION.CHUNK_RADIUS;
    const expectedCallsPerFrame = (radius * 2 + 1) ** 2;

    // Frame 1: Initial update (shouldFullUpdate = true)
    chunkManager.update(playerPos);

    // Frame 2: Throttled (shouldFullUpdate = false)
    chunkManager.update(playerPos);

    // Frame 3: Throttled (shouldFullUpdate = false)
    chunkManager.update(playerPos);

    // With optimization, the loop runs only once in these 3 frames.
    // ensureChunk is called (radius*2+1)^2 times total.

    const callCount = loaderMock.ensureChunk.mock.calls.length;

    expect(callCount).toBe(expectedCallsPerFrame * 1);

    // Verify processGenerationQueue is called every frame
    const generationCallCount = loaderMock.processGenerationQueue.mock.calls.length;
    expect(generationCallCount).toBe(3);
  });
});
