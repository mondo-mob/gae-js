import { CloudTasksClient } from "@google-cloud/tasks";
import fetch from "node-fetch";
import { configurationProvider, createLogger, runningOnGcp } from "@mondomob/gae-js-core";
import { CreateTaskQueueServiceOptions, CreateTaskRequest, TaskOptions, TaskQueueServiceOptions } from "./types";
import { tasksProvider } from "./tasks-provider";

export class TaskQueueService {
  private logger = createLogger("taskQueueService");
  private readonly options: TaskQueueServiceOptions;

  constructor(options?: CreateTaskQueueServiceOptions) {
    const projectId = options?.projectId || configurationProvider.get().projectId;
    const location = options?.location || configurationProvider.get().location;
    if (!location) {
      throw new Error(
        'Cannot resolve queue location - please configure "location" for application or supply "location" option when creating service'
      );
    }

    this.options = {
      ...options,
      projectId,
      location,
      queueName: options?.queueName || "default",
      pathPrefix: options?.pathPrefix || "/tasks",
    };
    const { queueName, pathPrefix } = this.options;
    this.logger.info(
      `Initialised task queue ${projectId}/${location}/${queueName} with target path prefix ${pathPrefix}`
    );
  }

  async enqueue<P extends object = object>(path: string, options: TaskOptions<P> = {}) {
    if (runningOnGcp()) {
      await this.appEngineQueue(path, options);
    } else {
      await this.localQueue(path, options);
    }
  }

  private async appEngineQueue(path: string, options: TaskOptions) {
    const client = this.getTasksClient();

    const { projectId, location, queueName } = this.options;
    const parent = client.queuePath(projectId, location, queueName);

    const createTaskRequest = this.buildTask(parent, path, options);

    this.logger.info("Creating task with payload: ", createTaskRequest.task);
    await client.createTask(createTaskRequest);
  }

  private async localQueue(path: string, options: TaskOptions) {
    const { data = {}, inSeconds = 0 } = options;
    const endpoint = `${this.getLocalBaseUrl()}${this.fullTaskPath(path)}`;
    this.logger.info(`Dispatching local task to ${endpoint} with delay ${inSeconds}s`);

    // Intentionally don't return this promise because we want the task to be executed
    // asynchronously - i.e. a tiny bit like a task queue would work. Otherwise if the caller
    // awaits this fetch then it will wait for the entire downstream process to complete.
    new Promise((resolve) => setTimeout(resolve, inSeconds * 1000))
      .then(() => {
        return fetch(endpoint, {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            "content-type": "application/json",
            "x-appengine-taskname": path,
          },
        });
      })
      .then(async (result) => {
        if (result.ok) {
          this.logger.info(`Task completed with status ${result.status}`);
        } else {
          this.logger.error(`Task failed to execute - status ${result.status}: ${await result.text()}`);
        }
      })
      .catch((e) => {
        this.logger.error(e, `Task failed to execute`);
      });
  }

  private buildTask(queuePath: string, path: string, options: TaskOptions): CreateTaskRequest {
    this.logger.info(`Using queue path: ${queuePath}`);
    const { data = {}, inSeconds } = options;
    const body = JSON.stringify(data);
    const requestPayload = Buffer.from(body).toString("base64");
    return {
      parent: queuePath,
      task: {
        appEngineHttpRequest: {
          relativeUri: `${this.fullTaskPath(path)}`,
          headers: {
            "Content-Type": "application/json",
          },
          body: requestPayload,
          ...this.taskRouting(),
        },
        ...this.taskSchedule(inSeconds),
      },
    };
  }

  private taskSchedule(inSeconds?: number) {
    return inSeconds
      ? {
          scheduleTime: {
            seconds: inSeconds + Math.floor(Date.now() / 1000),
          },
        }
      : {};
  }

  private taskRouting() {
    const { tasksRoutingService, tasksRoutingVersion } = this.options;
    if (tasksRoutingVersion || tasksRoutingService) {
      return {
        appEngineRouting: {
          ...(tasksRoutingService ? { service: tasksRoutingService } : {}),
          ...(tasksRoutingVersion ? { version: tasksRoutingVersion } : {}),
        },
      };
    }
    return {};
  }

  private fullTaskPath(targetTask: string): string {
    const noLeadingSlash = targetTask.startsWith("/") ? targetTask.slice(1) : targetTask;
    return `${this.options.pathPrefix}/${noLeadingSlash}`;
  }

  private getTasksClient = (): CloudTasksClient => {
    return this.options.tasksClient ?? tasksProvider.get();
  };

  private getLocalBaseUrl = (): string => {
    const url = this.options.localBaseUrl || configurationProvider.get().host;
    if (!url) {
      throw new Error(
        'Cannot resolve local base url - please configure "host" for application or supply "localBaseUrl" option when creating service'
      );
    }
    return url;
  };
}
