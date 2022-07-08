import { CloudTasksClient } from "@google-cloud/tasks";
import fetch from "node-fetch";
import { configurationProvider, createLogger, runningOnGcp } from "@mondomob/gae-js-core";
import { GaeJsTasksConfiguration } from "../configuration";

export interface TaskQueueServiceOptions {
  configuration?: GaeJsTasksConfiguration;
  queueName?: string;
  pathPrefix?: string;
}

export class TaskQueueService {
  private logger = createLogger("taskQueueService");
  private readonly queueName: string;
  private readonly pathPrefix: string;
  private readonly configuration: GaeJsTasksConfiguration;

  constructor(options?: TaskQueueServiceOptions) {
    this.configuration = options?.configuration || configurationProvider.get<GaeJsTasksConfiguration>();
    this.queueName = options?.queueName || "default";
    this.pathPrefix = options?.pathPrefix || "/tasks";
    this.logger.info(`Initialised task queue ${this.queueName} with target path prefix ${this.pathPrefix}`);
  }

  async enqueue<P extends object = object>(taskName: string, payload?: P, inSeconds?: number) {
    if (runningOnGcp()) {
      await this.appEngineQueue(taskName, payload, inSeconds);
    } else {
      await this.localQueue(taskName, payload);
    }
  }

  private async appEngineQueue(taskName: string, payload: object = {}, inSeconds?: number) {
    const client = new CloudTasksClient();

    const projectId = this.configuration.tasksProjectId || this.configuration.projectId;
    const location = this.configuration.tasksLocation || this.configuration.location;
    if (!location) {
      throw new Error('Cannot resolve queue location - please configure "tasksLocation" or "location"');
    }
    const serviceTasksOnThisVersion = !!this.configuration.serviceTasksOnThisVersion;

    const body = JSON.stringify(payload);
    const requestPayload = Buffer.from(body).toString("base64");

    const parent = client.queuePath(projectId, location, this.queueName);
    this.logger.info(`Using queue path: ${parent}`);

    const task = {
      appEngineHttpRequest: {
        relativeUri: `${this.fullTaskName(taskName)}`,
        headers: {
          "Content-Type": "application/json",
        },
        body: requestPayload,
        // will go to version taking traffic if not specified - enables testing offline
        ...(serviceTasksOnThisVersion
          ? {
              appEngineRouting: {
                version: process.env.GAE_VERSION,
              },
            }
          : {}),
      },
      ...(inSeconds
        ? {
            scheduleTime: {
              seconds: inSeconds + Date.now() / 1000,
            },
          }
        : {}),
    };

    this.logger.info("Creating task with payload: ", task);
    await client.createTask({
      parent,
      task,
    });
  }

  private async localQueue(taskName: string, payload: object = {}) {
    if (!this.configuration.host) {
      throw new Error('Cannot resolve local queue path - please configure "host"');
    }
    const endpoint = `${this.configuration.host}${this.fullTaskName(taskName)}`;
    this.logger.info(`Dispatching local task to ${endpoint}`);

    // Intentionally don't return this promise because we want the task to be executed
    // asynchronously - i.e. a tiny bit like a task queue would work. Otherwise if the caller
    // awaits this fetch then it will wait for the entire downstream process to complete.
    fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "content-type": "application/json",
        "x-appengine-taskname": taskName,
      },
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

  private fullTaskName(taskName: string): string {
    const noLeadingSlash = taskName.startsWith("/") ? taskName.slice(1) : taskName;
    return `${this.pathPrefix}/${noLeadingSlash}`;
  }
}
