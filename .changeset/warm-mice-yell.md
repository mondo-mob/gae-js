---
"@mondomob/gae-js-datastore": major
"@mondomob/gae-js-firestore": major
---

Fix so that isTransactionActive() does not error if there is no request storage set. Instead it returns false.

If you previously depended on an error being thrown this has the potential to be breaking. This also changes `execPostCommit` released in `@mondomob/gae-js-firestore@2.1.0` to be now called `execPostCommit`.
