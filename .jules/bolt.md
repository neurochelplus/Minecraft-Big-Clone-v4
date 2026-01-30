## 2024-05-22 - Redundant Chunk Queue Processing
**Learning:** The chunk radius loop in `ChunkManager.update` was running every frame, performing (2*R+1)^2 string allocations, Set insertions, and Map lookups, even when the player was stationary. This is a significant overhead for the main loop.
**Action:** When implementing spatial updates, always check if the update is necessary (e.g. player moved or interval passed) before running O(N^2) loops over the grid. Use "dirty" flags or intervals to throttle these operations.
