import { CloudTasksClient } from "@google-cloud/tasks";
import fetch from "node-fetch";
import { configurationProvider, createLogger, runningOnGcp } from "@dotrun/gae-js-core";
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

  async enqueue(taskName: string, payload: any = {}, inSeconds?: number) {
    if (runningOnGcp()) {
      await this.appEngineQueue(taskName, payload, inSeconds);
    } else {
      await this.localQueue(taskName, payload);
    }
  }

  async appEngineQueue(taskName: string, payload: any = {}, inSeconds?: number) {
    const client = new CloudTasksClient();

    const projectId = this.configuration.projectId;
    const location = this.configuration.location;
    const serviceTasksOnThisVersion = !!this.configuration.serviceTasksOnThisVersion;

    const body = JSON.stringify(payload);
    const requestPayload = Buffer.from(body).toString("base64");

    const parent = client.queuePath(projectId, location, this.queueName);

    const task = {
      appEngineHttpRequest: {
        relativeUri: `${this.pathPrefix}/${taskName}`,
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

  async localQueue(taskName: string, payload: any = {}) {
    const endpoint = `${this.configuration.host}${this.pathPrefix}/${taskName}`;
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
    }).then(async (result) => {
      if (!result.ok) {
        throw new Error(`Task failed to execute - status ${result.status}: ${await result.text()}`);
      }
    });
  }
}
