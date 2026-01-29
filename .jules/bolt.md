## 2024-05-22 - [ChunkManager Update Loop Throttling]
**Learning:** `ChunkManager.update` was executing the chunk radius check loop (allocating ~289 strings and performing map lookups) every frame, despite `shouldFullUpdate` throttling logic existing. The loop was accidentally placed outside the throttle block.
**Action:** Ensure that expensive recurring checks in update loops are strictly placed inside their respective throttling/timer blocks. verify with simple counters or tests.
