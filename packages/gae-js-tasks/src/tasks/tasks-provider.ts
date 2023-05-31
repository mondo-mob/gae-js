import { CloudTasksClient } from "@google-cloud/tasks";
import { createLogger, Provider, runningOnGcp } from "@mondomob/gae-js-core";

export class TasksProvider extends Provider<CloudTasksClient> {
  init(tasksClient?: CloudTasksClient): void {
    if (tasksClient) {
      this.set(tasksClient);
    } else if (runningOnGcp()) {
      this.set(new CloudTasksClient());
    } else {
      createLogger("TasksProvider").info("Skipped creating CloudTasksClient for local service");
    }
  }
}

export const tasksProvider = new TasksProvider(
  undefined,
  "No CloudTasksClient instance found. Please initialise tasksProvider."
);
