---
"@mondomob/gae-js-storage": minor
---

Add option to skip default bucket validation. In some cases you may have a bucket where you only have write access. Validating a bucket with exists() requires read. Option allows this check to be skipped.
