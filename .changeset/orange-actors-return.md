---
"@mondomob/gae-js-firestore": major
---

Breaking: FirestoreRepository deleteAll() function throws an error by default if called within a transaction. This never actually worked within a transaction and was previously operating outside of the transaction context. There was also a bug where the data loader state was not being cleared and that has now been resolved. If you desperately want the same functionality of deleteAll() executing regardless of the containing transaction for backwards compatibility it is not recommended but you can supply `{ ignoreTransaction: true }`. A better approach would be to enqueue a task with retries.
