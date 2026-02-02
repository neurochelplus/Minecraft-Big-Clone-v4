## 2024-05-23 - [ChunkManager Update Loop Optimization]
**Learning:** The `ChunkManager.update` method was iterating over the entire chunk radius (typically 49+ chunks) every single frame to check for missing chunks, creating unnecessary string allocations and map lookups.
**Action:** The check for missing chunks (queue population) should be throttled alongside the `shouldFullUpdate` logic (every 3 frames or on movement), while keeping the queue processing (`processGenerationQueue`) running every frame. This reduces overhead by ~66% for static players.
