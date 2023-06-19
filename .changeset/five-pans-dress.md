---
"@mondomob/gae-js-tasks": minor
---

Add support for throttling tasks based on Cloud Tasks built-in task deduplication.

e.g. to only execute a task once every 60 seconds 
```typescript
await taskService.enqueue(
  "start-job", 
  { 
    body: { jobname: "job123" },
    throttle: { suffix: "start-job", periodMs: 60000 } 
  }
);
```

For throttled tasks, the service will calculate the next execution window for the given period.
The task will then be assigned an explicit task name based on this window and the provided suffix.
Subsequent tasks within the same window will be assigned the same name and Cloud Tasks will reject them. 
The service will automatically identify and ignore these rejections.