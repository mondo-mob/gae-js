# GAE JS DATASTORE BACKUPS

Module to perform scheduled Datastore exports in your app.

Backups can be configured to perform full or partial exports of Datastore into Google Cloud Storage.

As well as regular backups you can configure automatic export and import into BigQuery.
This is a full import/export and any existing data in BigQuery will be deleted for the requested kinds.

Datastore exports are long-running operations. This module keeps track of operations it starts in a `backup-operations` kind.
After an operation is started it will queue tasks to update the status of the operation until it is complete.
Once complete the backup can be auto-imported into BigQuery.

## Installation

```sh
npm install @mondomob/gae-js-datastore-backups
```

## Quick Start

### Create queue to handle backup tasks

By default this library uses the task queue named `backup-queue`, so create that if it doesn't exist.
Alternatively add configuration for the queue you wish to use.

e.g. add to `queue.yaml` (or add equivalent to terraform, etc)
```yaml
queue:
  - name: backup-queue
    mode: push
    rate: 1/s
    retry_parameters:
      task_retry_limit: 20
      min_backoff_seconds: 120
      max_doublings: 5
```

### Create bucket to store backup data

By default this library will use a bucket called `datastore-backup-[PROJECT_ID]`, so create that if it doesn't exist.
This must be a regional bucket in the same region as your datastore instance.
Alternatively you can add configuration for the bucket you wish to use.

### Add IAM Roles

Authorise the App Engine Default Service account to perform datastore exports
In Google Cloud Console IAM & Admin add the following IAM role: 
- `Datastore -> Cloud Datastore Import Export Admin`

### Add cron and task routes to your app

e.g. at the root application
```typescript
  app.use("/crons", gaeJsCron, datastoreBackupCronRoutes());
  app.use("/tasks", gaeJsTask, datastoreBackupTaskRoutes());
```

or as part of a sub-application/sub-router
```typescript
  const cronsController = Router();
  cronsController.use(datastoreBackupCronRoutes())
  cronsController.get("/some-other-cron", asyncHandler(async () => {}))

  app.use("/crons", gaeJsCron, cronsController);

  const tasksController = Router();
  tasksController.use(datastoreBackupTaskRoutes())
  tasksController.post("/some-other-task", asyncHandler(async () => {}))

  app.use("/tasks", gaeJsTask, tasksController);
```

### Add Cron schedule

Add cron schedules to your `cron.yaml` for the backup jobs you wish to run. e.g.

```yaml
cron:
  - description: "Datastore export"
    url: /crons/backups/datastore?type=EXPORT&name=FullBackup
    schedule: every day 03:00
    timezone: Australia/NSW

  - description: "Datastore export and load to BigQuery"
    url: /crons/backups/datastore?type=EXPORT_TO_BIGQUERY&name=ExportToBigQuery&targetDataset=backup_data&collectionIds=demo-items
    schedule: every day 03:00
    timezone: Australia/NSW
```

#### Endpoint options

Default endpoint: `GET /crons/backups/datastore`

Query params:

| Property      | Description                                                                    | Required                               |
|---------------|--------------------------------------------------------------------------------|----------------------------------------|
| type          | The type of export to perform. Must be one of "EXPORT" or "EXPORT_TO_BIGQUERY" | Y                                      |
| name          | name for the datastore export                                                  | N                                      |
| kinds         | the kinds to be exported                                                       | N for EXPORT, Y for EXPORT_TO_BIGQUERY |
| targetDataset | the target dataset for import in BigQuery                                      | Y for EXPORT_TO_BIGQUERY               |


### Edit configuration (if required)

No configuration is required if you are happy with the default conventions. 

The following options are available under the `datastoreBackup` namespace.

| Property     | Description                                                                                   | Required |
|--------------|-----------------------------------------------------------------------------------------------|----------|
| bucket       | the GCS bucket to export to. Default is `datastore-backup-[PROJECT_ID]`                       | N        |
| folderFormat | folder format to use - using Luxon date formatting options. Default `yyyy/MM/yyyyMMdd-HHmmss` | N        |
| queue        | the queue to send backup tasks to. Default `backup-queue`                                     | N        |
| taskPrefix   | tasks handler url prefix. Default `/tasks`                                                    | N        |
| taskService  | the app engine service to direct task requests to. Defaults to `default` service              | N        |
| timeZone     | the timezone to use when formatting backup output folder. Defaults to `"Australia/Sydney"     | N        |

e.g.
```json
{
  "projectId": "my-project-dev",
  "datastoreBackup": {
    "bucket": "my-backup-bucket",
    "queue": "admin-queue",
    "taskPrefix": "/tasks/admin",
    "taskService": "backup-service",
    "timeZone": "Australia/Sydney"
  }
}
```
