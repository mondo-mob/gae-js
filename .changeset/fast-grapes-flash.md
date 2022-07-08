---
"@mondomob/gae-js-core": major
---

Renamed `handleAsync` to `asyncMiddleware()` and added new variant `asyncHandler()`, which will NOT call next() for a resolved promise. Update your code to the version to match your expected behaviour.
