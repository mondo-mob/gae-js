# GAE JS DATASTORE BACKUPS

Module to perform scheduled Datastore exports in your app.

Backups can be configured to perform full or partial exports of Datastore into Google Cloud Storage.

As well as regular backups you can configure automatic export and import into BigQuery.
This is a full import/export and any existing data in BigQuery will be deleted for the requested kinds.

Datastore exports are long-running operations. This module keeps track of operations it starts in a `backup-operations` kind.
After an operation is started it will queue tasks to update the status of the operation until it is complete.
Once complete the backup can be auto-imported into BigQuery.

[Official documentation](https://mondo-mob.github.io/gae-js-docs/packages/gae-js-datastore-backups.html)