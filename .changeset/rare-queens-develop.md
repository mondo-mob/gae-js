---
"@mondomob/gae-js-tasks": major
---

Improve typing for task queue service and require payload to extend (object). This is potentially breaking as it allowed any before. Hide internal functions which were accidentally exposed as public previously.

**Breaking changes**

 - `enqueue` payload must now extend `object` as it converts to a JSON string and was assuming so. If you previously called with a primitive, then wrap in an object.
 - Internal functions for `appEngineQueue` and `localQueue` marked `private` as they are not intended to be called directly.
