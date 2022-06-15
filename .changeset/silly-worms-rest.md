---
"@mondomob/gae-js-datastore": major
---

BREAKING: Add DatastoreKeyRepository to support handling entities with ancestors. This required refactoring the existing code into AbstractRepository. Contract has changed but existing code should work without changes.
