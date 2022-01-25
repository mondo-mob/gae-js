# GAE JS TASKS

Use Cloud Tasks to call task handler endpoints in your app.

## Installation

```sh
npm install @mondomob/gae-js-tasks
```

## Components

### TaskQueueService
Helper service for enqueuing tasks.

This uses the convention that tasks will be handled by a POST route of the current application, 
with a configured path prefix (default `/tasks`) and path name equal to that of the task name.
e.g. for a task name of `poll-status` the target URI of the enqueued task will be 
`POST /tasks/poll-status`

When deployed to GCP will enqueue to a real task queue (default queue of `default`). Locally will
immediately invoke the target URI.

```
// Create new service instance
const taskService = new TaskQueueService({queueName: "default"});

// Enqueue a task on queue `default` to call endpoint `/tasks/poll-status` with provided payload
await taskService.enqueue("poll-status", {jobId: "1234"});
```

### gaeJsTask Middleware
A convenience middleware collection for your task endpoints to:

a) verify the request is a genuine Cloud Tasks request (see verifyTask middleware) and
b) extend the NodeJS request timeout to 10 minutes (the default is 120s)

```
// Apply middleware however you normally would
app.use("/tasks", gaeJsTask);

// Now any matching routes will be protected and timeout extended
app.post("/tasks/start-job", (req, res) => res.send("OK"));
app.post("/tasks/poll-status", (req, res) => res.send("OK"));
```

### verifyTask Middleware
Use this on your task handlers to ensure they are only called by genuine Cloud Tasks requests.
NOTE: This is already part of the gaeJsTask middleware so no need to apply again if using that.

```
// Apply middleware however you normally would
app.use("/tasks", verifyTask);

// Now any matching routes will be protected
app.post("/tasks/start-job", (req, res) => res.send("OK"));
app.post("/tasks/poll-status", (req, res) => res.send("OK"));
```