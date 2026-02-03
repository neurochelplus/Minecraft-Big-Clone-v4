## 2024-05-23 - ChunkManager Update Loop Optimization
**Learning:** The `ChunkManager.update` loop was iterating over the chunk radius (49 iterations) and constructing string keys/checking map existence EVERY FRAME, even when the player hadn't moved chunks. This burned CPU cycles unnecessarily.
**Action:** Always check if a loop in an `update()` method is actually needed every frame. If the output depends on state that changes infrequently (like chunk coordinates), guard the loop with a state change check.
