import { CloudTasksClient } from "@google-cloud/tasks";

type Mandatory<T, K extends keyof T> = Pick<Required<T>, K> & Omit<T, K>;

export type CreateTaskRequest = Parameters<CloudTasksClient["createTask"]>[0];
export type ITask = NonNullable<CreateTaskRequest["task"]>;
export type IHttpRequest = NonNullable<ITask["httpRequest"]>;
export type IAppEngineHttpRequest = NonNullable<ITask["appEngineHttpRequest"]>;
export type IOidcToken = NonNullable<IHttpRequest["oidcToken"]>;

/**
 * Options specific to creation of App Engine Tasks.
 */
export type AppEngineTargetOptions = {
  /**
   * The specific App Engine version to dispatch requests to.
   */
  tasksRoutingVersion?: string;
  /**
   * The specific App Engine service to dispatch requests to.
   */
  tasksRoutingService?: string;

  httpTargetHost?: never;
  oidcToken?: never;
};

/**
 * Options specific to creation of Http Target Tasks
 * NOTE: When using http targets - there is no built-in authentication and task handlers
 *       must perform their own auth validation.
 */
export type HttpTargetOptions = {
  /**
   * Override the httpTargetHost when creating HTTP Target tasks. This will create a task with `httpRequest` params.
   * Use this when you want the request to be routed to a different host than the default GAE appspot domain.
   */
  httpTargetHost: string;
  /**
   * Should be the email of an existing Service Account in the same project.
   * Authorizes the request with a Bearer JWT id token.
   */
  oidcToken?: IOidcToken;

  tasksRoutingVersion?: never;
  tasksRoutingService?: never;
};

export type TaskQueueTargetOptions = AppEngineTargetOptions | HttpTargetOptions;

export type CommonTaskQueueServiceOptions = {
  /**
   * Tasks projectId - most likely the same project as your application.
   * Defaults to application projectId configuration
   */
  projectId?: string;
  /**
   * Tasks location - most likely the same location as your application
   * Defaults to application location configuration (if set)
   */
  location?: string;
  /**
   * Name of task queue this service will send requests to.
   * Defaults to "default"
   */
  queueName?: string;
  /**
   * Path prefix for target task handlers.
   * Often tasks will be handled under a common path with task related security rules applied.
   * e.g. For targets of /tasks/users/reindex, /tasks/orders/sendConfirmation. Prefix will be /tasks.
   * Defaults to "/tasks"
   */
  pathPrefix?: string;
  /**
   * Host to send task requests to when emulating task queue behaviour locally.
   * Defaults to application "host" configuration.
   */
  localBaseUrl?: string;
  /**
   * Tasks client to use (if not using tasksProvider)
   */
  tasksClient?: CloudTasksClient;
};

export type CreateTaskQueueServiceOptions = CommonTaskQueueServiceOptions & TaskQueueTargetOptions;

export type TaskQueueServiceOptions = Mandatory<
  CommonTaskQueueServiceOptions,
  "projectId" | "location" | "queueName" | "pathPrefix"
> &
  TaskQueueTargetOptions;

export interface TaskOptions<P extends object = object> {
  /**
   * Payload to send as the body of the task request
   */
  data?: P;
  /**
   * Schedule the task to execute in a number of seconds
   */
  inSeconds?: number;
  /**
   * Throttle how often duplicate requests are executed.
   * This is based on the built-in task deduplication:
   * https://cloud.google.com/tasks/docs/reference/rest/v2/projects.locations.queues.tasks/create#request-body
   */
  throttle?: TaskThrottle;
}

export interface TaskThrottle {
  /**
   * Throttle period. Only a single task will be executed within this time.
   * Tasks are scheduled to be executed on the trailing edge of this period.
   * e.g. for throttle period of 60s, tasks submitted at 12:00:10, 12:00:30 and 12:00:50 will be deduplicated into
   * a single execution at 12:01:00.
   */
  periodMs: number;
  /**
   * Task name suffix to differentiate between different types of task.
   * Without a suffix all tasks on the same queue will be throttled together.
   */
  suffix: string;
  /**
   * Time buffer to allow for latency between sending task, task deduplication and execution.
   * e.g. for throttle period of 60s, if time is 12:00:59 we don't want to allocate the task to 12:01:00 window,
   * because there's a chance that by the time the request is processed by GCP the original window will have passed.
   * The request will be rejected but may leave some data unprocessed. Instead, we should schedule at 12:02:00 to
   * ensure the task is executed.
   * Defaults to 5000ms
   */
  bufferMs?: number;
  /**
   * By default, execution windows are calculated from zero. e.g. a period of 60s will execute every minute at
   * 12:01:00, 12:02:00, etc. If throttling multiple requests this could result in bursts of requests.
   * Use an offset to spread the execution times. e.g. a period of 60s with an offset of 30s would execute
   * at 12:01:30, 12:02:30, etc.
   * Defaults to 0
   */
  offsetMs?: number;
}
