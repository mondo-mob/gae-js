---
"@mondomob/gae-js-storage": minor
---

Support defining storage client credentials via app configuration. This is useful for local development
where a service account is required for things like signed urls. Combined with configuration secrets lookup
this allows connecting using a service account with the key stored in Secrets Manager.
