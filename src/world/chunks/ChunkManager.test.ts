// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChunkManager } from './ChunkManager';
import * as THREE from 'three';

// Define the mock implementation
const mockLoaderInstance = {
  init: vi.fn(),
  getChunks: vi.fn().mockReturnValue(new Map()),
  ensureChunk: vi.fn(),
  processGenerationQueue: vi.fn(),
  unloadChunk: vi.fn(),
  updateChunkSorting: vi.fn(),
  getChunksData: vi.fn().mockReturnValue(new Map()),
  getDirtyChunks: vi.fn().mockReturnValue(new Set()),
  close: vi.fn(),
  setSeed: vi.fn(),
  getSeed: vi.fn(),
  getNoiseTexture: vi.fn(),
};

// Mock dependencies
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
        return {
            update: vi.fn(),
            clearBounds: vi.fn(),
            clearAll: vi.fn(),
        }
      }
    }
  };
});

// Mock logger
vi.mock('../../utils/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

describe('ChunkManager Performance', () => {
  let chunkManager: ChunkManager;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Reset call counts on the shared mock instance
    Object.values(mockLoaderInstance).forEach(mock => {
      if (vi.isMockFunction(mock)) mock.mockClear();
    });

    // Ensure getChunks returns empty map by default
    mockLoaderInstance.getChunks.mockReturnValue(new Map());

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1920 });

    const scene = new THREE.Scene();
    chunkManager = new ChunkManager(scene);
  });

  it('should not scan for chunks every frame when player is stationary', () => {
    const playerPos = new THREE.Vector3(0, 0, 0);

    // First update - should trigger full update
    chunkManager.update(playerPos);

    const initialCalls = mockLoaderInstance.ensureChunk.mock.calls.length;
    console.log('Initial calls:', initialCalls);
    expect(initialCalls).toBeGreaterThan(0);

    // Second update - player stationary, interval not reached
    chunkManager.update(playerPos);

    const finalCalls = mockLoaderInstance.ensureChunk.mock.calls.length;
    console.log('Final calls:', finalCalls);

    // Expectation: No new calls to ensureChunk
    // This will FAIL on current code
    expect(finalCalls).toBe(initialCalls);
  });
});
