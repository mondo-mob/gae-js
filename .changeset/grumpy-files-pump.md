---
"@mondomob/gae-js-firestore": major
---

BREAKING: beforePersist is only concerned with a single entity instance and beforePersistBatch is available if you really need to know about the whole OneOrMany

This change simplifies the implementation in sub-classes, removing the burden for handling one or many.

To fix: change your `beforePersist` function to only deal with a single entity instance. If you _really_ need to operate on the whole batch you can consider using `beforePersistBatch`.
