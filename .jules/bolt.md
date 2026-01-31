## 2026-01-31 - [ChunkManager Update Loop]
**Learning:** Calculating the set of active chunks in a radius every frame is a significant source of allocations (Strings/Sets) and CPU time, even if the result rarely changes.
**Action:** Always wrap "active region" recalculations in a spatial-change check (has moved chunk) or a throttle timer. Only process the *queue* every frame.
