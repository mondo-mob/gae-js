---
"@mondomob/gae-js-firestore": patch
---

Clone documents added to and returned from DataLoader cache. This prevents polluting the 
cache if a caller mutates either the original documents passed to the loader or any document
returned from the cache.
