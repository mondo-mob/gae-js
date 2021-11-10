---
"@dotrun/gae-js-core": patch
"@dotrun/gae-js-datastore": patch
"@dotrun/gae-js-firebase-auth": patch
"@dotrun/gae-js-firestore": patch
"@dotrun/gae-js-gae-search": patch
"@dotrun/gae-js-storage": patch
"@dotrun/gae-js-tasks": patch
---

Use `prepublishOnly` script to trigger build instead of `prepublish` which is no longer run during publish lifecycle in npm 7+
