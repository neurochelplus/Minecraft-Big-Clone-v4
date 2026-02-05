## 2024-05-22 - Chunk Queue Throttling
**Learning:** The chunk update loop was iterating through the entire chunk radius every frame (allocating strings and checking maps), even though full updates were already throttled.
**Action:** Move the loop logic inside the throttled block. Only `processGenerationQueue` needs to run every frame.
