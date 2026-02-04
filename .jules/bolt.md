## 2024-05-23 - [Chunk Update Loop Optimization]
**Learning:** The `ChunkManager.update` loop iterates over the entire chunk radius (typically 49 chunks) every single frame, performing string allocations and map lookups, even when the player hasn't moved and no full update is required. This is a significant redundant operation in the hot path.
**Action:** Always check if a loop in a recurring update method needs to run every frame or if it can be throttled/conditional. For `ChunkManager`, moving the loop inside the `shouldFullUpdate` check saves ~50 iterations per frame.
