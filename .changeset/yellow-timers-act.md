---
"@mondomob/gae-js-tasks": major
---

BREAKING: gae-js-core `host` and `location` configuration properties are now optional. This may be break typings expecting them to be non-null.

Add `tasksLocation` and `tasksProjectId` configuration to allow overriding core properties.
