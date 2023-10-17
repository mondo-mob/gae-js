import fetch from "node-fetch";
import { BadRequestError, createLogger } from "@mondomob/gae-js-core";
import { CreateTaskRequest } from "./types";

// Keep track of used task names (for simulating task deduplication)
const taskNames = new Set<string>();
const logger = createLogger("LocalTasks");

export const localTasksServiceAccountEmailKey = "x-local-tasks-service-account-email";
export const createLocalTask = async (targetHost: string, createTaskRequest: CreateTaskRequest) => {
  const { parent, task } = createTaskRequest;
  if (!parent || !task) throw new BadRequestError("parent and task must be supplied");

  const { appEngineHttpRequest, httpRequest } = task;
  if (!appEngineHttpRequest && !httpRequest)
    throw new BadRequestError("appEngineHttpRequest or httpRequest must be defined");

  const getEndpoint = () => {
    if (appEngineHttpRequest) {
      return `${targetHost}${appEngineHttpRequest.relativeUri}`;
    }

    if (httpRequest?.url) {
      const url = new URL(httpRequest.url);
      return `${targetHost}${url.pathname}`;
    }
  };

  const endpoint = getEndpoint();

  if (!endpoint) {
    throw new BadRequestError("endpoint could not be resolved");
  }

  if (task.name) {
    if (taskNames.has(task.name)) {
      throw {
        code: 6,
        details: "already exists",
      };
    }
    taskNames.add(task.name);
  }

  const delayMs = task.scheduleTime?.seconds ? Number(task.scheduleTime?.seconds) * 1000 - new Date().getTime() : 0;
  const getBody = () => {
    if (appEngineHttpRequest) {
      return Buffer.from(appEngineHttpRequest.body as string, "base64").toString("ascii");
    }

    if (httpRequest) {
      return Buffer.from(httpRequest.body as string, "base64").toString("ascii");
    }
  };

  // Intentionally don't return this promise because we want the task to be executed
  // asynchronously - i.e. a tiny bit like a task queue would work. Otherwise, if the caller
  // awaits this fetch then it will wait for the entire downstream process to complete.
  logger.info(`Dispatching local task to ${endpoint} with delay ${delayMs / 1000}s`);
  new Promise((resolve) => setTimeout(resolve, Math.max(delayMs, 0)))
    .then(() => {
      return fetch(endpoint, {
        method: "POST",
        body: getBody(),
        headers: {
          "content-type": "application/json",
          "x-appengine-taskname": endpoint,
          [localTasksServiceAccountEmailKey]: httpRequest?.oidcToken?.serviceAccountEmail || "",
        },
      });
    })
    .then(async (result) => {
      if (result.ok) {
        logger.info(`Task completed with status ${result.status}`);
      } else {
        logger.error(`Task failed to execute - status ${result.status}: ${await result.text()}`);
      }
    })
    .catch((e) => {
      logger.error(e, `Task failed to execute`);
    });
};
