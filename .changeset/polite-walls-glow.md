---
"@mondomob/gae-js-tasks": minor
---

Add support for creating Http Target tasks (thanks @VivekRajagopal!).

Use this to target tasks handlers on any http address - i.e. non app engine handlers, app engine 
handlers hosted in a different project from the task queue or app engine handlers
but not via the default appspot domain.

When creating the task service specify the target host and optional authentication configuration.

```typescript
// Create service
const taskQueueService = new TaskQueueService({
  httpTargetHost: "https://my-host.com",
  oidcToken: {
    serviceAccountEmail: "my-service-account@example.com",
    audience: "my-audience",
  },
});

// Create tasks
// e.g. this will result in a task request of: POST https://my-host.com/tasks/example-task
await taskQueueService.enqueue("example-task", { data: { key: "value1" } })
```


