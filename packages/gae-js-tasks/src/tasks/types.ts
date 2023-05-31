import { CloudTasksClient } from "@google-cloud/tasks";

type Mandatory<T, K extends keyof T> = Pick<Required<T>, K> & Omit<T, K>;

export type CreateTaskRequest = Parameters<CloudTasksClient["createTask"]>[0];

export interface CreateTaskQueueServiceOptions {
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
   * The specific App Engine version to dispatch requests to.
   */
  tasksRoutingVersion?: string;
  /**
   * The specific App Engine service to dispatch requests to.
   */
  tasksRoutingService?: string;
  /**
   * Tasks client to use (if not using tasksProvider)
   */
  tasksClient?: CloudTasksClient;
}

export type TaskQueueServiceOptions = Mandatory<
  CreateTaskQueueServiceOptions,
  "projectId" | "location" | "queueName" | "pathPrefix"
>;

export interface TaskOptions<P extends object = object> {
  /**
   * Payload to send as the body of the task request
   */
  data?: P;
  /**
   * Schedule the task to execute in a number of seconds
   */
  inSeconds?: number;
}
