# GAE JS TASKS

Use Cloud Tasks to call task handler endpoints in your app.

## Installation

```sh
npm install @dotrun/gae-js-tasks
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
