## 2024-05-23 - [Chunk Update Loop Optimization]
**Learning:** In voxel engines, iterating over the chunk radius every frame to check for missing chunks is expensive (string allocations, map lookups).
**Action:** Always throttle chunk radius checks (e.g., using `shouldFullUpdate` flag) or only run them when the player moves across chunk boundaries. Ensure the generation queue processing remains independent of this check to avoid stalls.
