---
"@mondomob/gae-js-datastore": major
---

Refactor of repositories to improve support for child entities and allow entities using numeric ids.

- All repositories now have "byKey" methods. e.g. `getByKey`, `deleteByKey`
- Repositories can support entities with string and numeric ids
- `DatastoreKeyRepository` has been renamed `DatastoreChildRepository` to better represent its purpose and 
`parentProperty` configuration is now required.
