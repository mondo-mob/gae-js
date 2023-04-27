---
"@mondomob/gae-js-storage": patch
---

FIX: Catch any errors in dangling promise that validates default bucket exists in background. This is meant to be informative in the logs only. Also log info if bucket was validated successfully.
