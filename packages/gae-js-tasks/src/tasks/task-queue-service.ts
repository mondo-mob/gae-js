import * as crypto from "crypto";
import { CloudTasksClient } from "@google-cloud/tasks";
import { Status } from "google-gax";
import { configurationProvider, createLogger, runningOnGcp } from "@mondomob/gae-js-core";
import {
  CreateTaskQueueServiceOptions,
  CreateTaskRequest,
  TaskOptions,
  TaskQueueServiceOptions,
  TaskThrottle,
} from "./types";
import { tasksProvider } from "./tasks-provider";
import { createLocalTask } from "./local-tasks";
import { isGoogleGaxError } from "../utils/errors";

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

  async enqueue<P extends object = object>(path: string, taskOptions: TaskOptions<P> = {}) {
    if (taskOptions.throttle && taskOptions.inSeconds) {
      throw new Error("Tasks cannot be created with both 'throttle' and 'inSeconds' options");
    }
    if (taskOptions.throttle?.offsetMs && taskOptions.throttle.offsetMs > taskOptions.throttle.periodMs) {
      throw new Error("Throttle offset must be less than period");
    }

    const createTaskRequest = this.buildTask(path, taskOptions);

    this.logger.info("Creating task with payload: ", createTaskRequest.task);
    try {
      if (runningOnGcp()) {
        await this.getTasksClient().createTask(createTaskRequest);
      } else {
        await createLocalTask(this.getLocalBaseUrl(), createTaskRequest);
      }
      this.logger.info("Created task");
    } catch (e) {
      if (taskOptions.throttle && isGoogleGaxError(e, Status.ALREADY_EXISTS)) {
        const scheduled = new Date(Number(createTaskRequest.task?.scheduleTime?.seconds) * 1000);
        this.logger.info(
          createTaskRequest.task,
          `Ignoring ALREADY_EXISTS error for throttled task: ${
            taskOptions.throttle.suffix
          } scheduled for ${scheduled.toISOString()}`
        );
      } else {
        throw e;
      }
    }
  }

  private buildTask(path: string, options: TaskOptions): CreateTaskRequest {
    const { projectId, location, queueName } = this.options;
    const queuePath = runningOnGcp()
      ? this.getTasksClient().queuePath(projectId, location, queueName)
      : `projects/${projectId}/locations/${location}/queues/${queueName}`;
    this.logger.info(`Using queue path: ${queuePath}`);

    const { data = {}, inSeconds, throttle } = options;
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
        ...this.taskThrottle(queuePath, throttle),
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

  private taskThrottle(queuePath: string, options?: TaskThrottle) {
    if (!options) return {};

    // Calculate the time window for this request
    const now = new Date();
    const scheduleTime = this.calculateThrottleWindow(now, options);
    this.logger.info(`Throttling to time window: ${now.toISOString()} => ${new Date(scheduleTime).toISOString()}`);

    // Task name prefix needs to be hashed to prevent performance issues with incremental ids like timestamps
    const scheduleHash = crypto.createHash("md5").update(`${scheduleTime}`).digest("hex");
    const name = `${queuePath}/tasks/${scheduleHash}_${options.suffix}`;

    return {
      name,
      scheduleTime: {
        seconds: Math.floor(scheduleTime / 1000),
      },
    };
  }

  private calculateThrottleWindow(now: Date, options: TaskThrottle): number {
    const { periodMs, bufferMs = 5000, offsetMs = 0 } = options;
    const nextWindow = now.getTime() + periodMs - (now.getTime() % periodMs) + offsetMs;
    const withinBuffer = nextWindow - now.getTime() < bufferMs;
    return withinBuffer ? nextWindow + periodMs : nextWindow;
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
