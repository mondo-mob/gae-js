---
"@mondomob/gae-js-core": major
"@mondomob/gae-js-datastore": patch
"@mondomob/gae-js-firestore": patch
---

Removed io-ts dependencies and all related code. It's recommended to update to use zod instead but any code
still dependent on io-ts should include `io-ts`, `fp-ts` and `io-ts-reporters` directly. The `iotsValidator`
code can be taken from the project history.
