---
"@mondomob/gae-js-datastore": major
---

Improve repository typings support for filtering and sorting by nested properties, including those that are nullable.
Won't be breaking unless you explicitly use the `PropertySort` interface. To upgrade - remove the generic type from the interface.
