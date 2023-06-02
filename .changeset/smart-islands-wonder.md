---
"@mondomob/gae-js-firestore": major
---

BREAKING: isFirestoreError was exposing the wrong type from Google libs for checking status code

Use `GrpcStatus` enum instead of `StatusCode`. Replace references of
`import { StatusCode } from "@google-cloud/firestore/build/src/status-code";`

with

`import { GrpcStatus } from "@google-cloud/firestore";`
