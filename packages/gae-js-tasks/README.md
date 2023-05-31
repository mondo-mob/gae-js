# GAE JS TASKS

Use Cloud Tasks to call task handler endpoints in your app.

## Installation

```sh
npm install @mondomob/gae-js-tasks
```

## Quick Start

```typescript
// Initialise tasks client (at app startup)
tasksProvider.init();

// Create task handlers
app.use("/tasks", gaeJsTask);
app.post("/tasks/poll-status", (req, res) => res.send("OK"));
app.post("/tasks/start-job", (req, res) => res.send("OK"));

// Create service
const taskService = new TaskQueueService();

// Queue tasks
await taskService.enqueue("poll-status");
await taskService.enqueue("start-job", { body: { jobname: "job123" }});
await taskService.enqueue("start-job", { body: { jobname: "job123" }, inSeconds: 60 });
```

## Components

### Tasks Client Provider
To have a global CloudTasksClient instance available to your entire application,
initialise the `tasksProvider`.

```typescript
// On app startup
tasksProvider.init();

// Elsewhere in the app
const tasksClient = tasksProvider.get();
```

### TaskQueueService
Helper service for enqueuing tasks.

This uses the convention that tasks will be handled by a POST route of the current application, 
with a configured path prefix (default `/tasks`) and path name equal to that of the target task handler.
e.g. for a target path of `poll-status` the target URI of the enqueued task will be 
`POST /tasks/poll-status`

When deployed to GCP the service will enqueue to a real task queue (default queue of `default`).
Locally will invoke the target URI against the configured local target host.

Using application configuration:
```typescript
const taskService = new TaskQueueService();

await taskService.enqueue("poll-status", {
  body: { jobId: "1234" },
  inSeconds: 60,
});
```

Using custom configuration:
```typescript
const taskService = new TaskQueueService({
    projectId: "my-tasks-project",
    location: "my-tasks-location",
    queueName: "myqueue"
  });

await taskService.enqueue("poll-status", {
  body: { jobId: "1234" },
  inSeconds: 60,
});
```

### gaeJsTask Middleware
A convenience middleware collection for your task endpoints to:

a) verify the request is a genuine Cloud Tasks request (see verifyTask middleware) and
b) extend the NodeJS request timeout to 10 minutes (the default is 120s)

```typescript
// Apply middleware however you normally would
app.use("/tasks", gaeJsTask);

// Now any matching routes will be protected and timeout extended
app.post("/tasks/start-job", (req, res) => res.send("OK"));
app.post("/tasks/poll-status", (req, res) => res.send("OK"));
```

### verifyTask Middleware
Use this on your task handlers to ensure they are only called by genuine Cloud Tasks requests.
NOTE: This is already part of the gaeJsTask middleware so no need to apply again if using that.

```typescript
// Apply middleware however you normally would
app.use("/tasks", verifyTask);

// Now any matching routes will be protected
app.post("/tasks/start-job", (req, res) => res.send("OK"));
app.post("/tasks/poll-status", (req, res) => res.send("OK"));
```