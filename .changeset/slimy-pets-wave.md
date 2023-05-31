---
"@mondomob/gae-js-tasks": major
---

Configuration schema removed. There are often multiple task queue service instances created for an application so providing 
application level settings for these settings didn’t make sense. All options provided by the schema can be passed when 
creating the tasks service instances.

enqueue method signature has changed to accept a single string and optional options object. This will allow additional 
options to be added without affecting signature in future.

Upgrade Instructions:

Remove any references to `gaeJsTasksConfigurationSchema` or `GaeJsTasksConfiguration`. Any properties you used should be added to your application’s configuration schema and passed as options when constructing the Tasks service instance.
e.g.
```typescript
const taskQueueService = new TaskQueueService({
  tasksRoutingService: "backend",
});
```

Calls to enqueue should be updated to use the new signature
e.g.
```typescript
enqueue("my-task", {id: "123"}, 60);
```

Should now be
```typescript
enqueue("my-task", {
  data: {id: "123"}, 
  inSeconds: 60 
});
```