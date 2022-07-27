---
"@mondomob/gae-js-firestore": patch
---

Validate mutex prefixes cannot contain "/" character since these are used to construct an id which cannot contain slashes.
