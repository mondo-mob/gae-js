---
"@mondomob/gae-js-firestore": minor
---

Post-commit actions are executed sequentially as this is more predictable for the caller

- The caller has control over whether to force parallelism by creating a post-commit action with a `Promise.all()` themselves, however each individual action will be called in order
- This also makes the code more consistent with the branch where it executes "immediately" if you are not within a transaction
- This fixes an issue where we see `DEADLINE_EXCEEDED` errors in app engine when too many tasks were being enqueued in parallel
