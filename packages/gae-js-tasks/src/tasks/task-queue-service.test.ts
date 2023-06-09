import nock from "nock";
import { initTestConfig, waitUntil } from "../__test/test-utils";
import { TaskQueueService } from "./task-queue-service";
import { CloudTasksClient } from "@google-cloud/tasks";
import { withEnvVars } from "@mondomob/gae-js-core/dist/__test/test-utils";
import { ENV_VAR_RUNTIME_ENVIRONMENT } from "@mondomob/gae-js-core";
import { tasksProvider } from "./tasks-provider";

jest.mock("@google-cloud/tasks");

describe("TaskQueueService", () => {
  let taskQueueService: TaskQueueService;

  beforeEach(async () => {
    await initTestConfig();
  });

  describe("enqueue", () => {
    describe("google tasks service", () => {
      beforeEach(() => {
        (CloudTasksClient as any).mockClear();
      });

      const expectTaskParams = (task: object) => {
        const instance = (CloudTasksClient as any).mock.instances[0];
        expect(instance.createTask).toHaveBeenCalledWith(
          expect.objectContaining({ task: expect.objectContaining(task) })
        );
      };

      it(
        "creates task params for default config",
        withEnvVars({ [ENV_VAR_RUNTIME_ENVIRONMENT]: "appengine" }, async () => {
          tasksProvider.init();
          taskQueueService = new TaskQueueService();

          await taskQueueService.enqueue("test-task");

          expectTaskParams({
            appEngineHttpRequest: {
              relativeUri: "/tasks/test-task",
              headers: { "Content-Type": "application/json" },
              body: Buffer.from(JSON.stringify({})).toString("base64"),
            },
          });
        })
      );

      it(
        "creates task params for delayed task",
        withEnvVars({ [ENV_VAR_RUNTIME_ENVIRONMENT]: "appengine" }, async () => {
          tasksProvider.init();
          taskQueueService = new TaskQueueService();

          const timeIn60Seconds = 60 + Math.floor(Date.now() / 1000);
          await taskQueueService.enqueue("test-task", { data: { key: "value1" }, inSeconds: 60 });

          expectTaskParams({
            appEngineHttpRequest: {
              relativeUri: "/tasks/test-task",
              headers: { "Content-Type": "application/json" },
              body: Buffer.from(JSON.stringify({ key: "value1" })).toString("base64"),
            },
            scheduleTime: { seconds: expect.toBeWithin(timeIn60Seconds, timeIn60Seconds + 5) },
          });
        })
      );

      it(
        "creates task params for specific service routing",
        withEnvVars({ [ENV_VAR_RUNTIME_ENVIRONMENT]: "appengine" }, async () => {
          tasksProvider.init();
          taskQueueService = new TaskQueueService({
            tasksRoutingService: "backend",
          });

          await taskQueueService.enqueue("test-task", { data: { key: "value1" } });

          expectTaskParams({
            appEngineHttpRequest: {
              relativeUri: "/tasks/test-task",
              headers: { "Content-Type": "application/json" },
              body: Buffer.from(JSON.stringify({ key: "value1" })).toString("base64"),
              appEngineRouting: {
                service: "backend",
              },
            },
          });
        })
      );
    });

    describe("local queue default config", () => {
      beforeEach(() => {
        process.env.GAEJS_ENVIRONMENT = "local";
        taskQueueService = new TaskQueueService();
      });

      it("posts to local task service", async () => {
        const scope = nock("http://127.0.0.1").post("/tasks/local-task").reply(204);
        await taskQueueService.enqueue("local-task");
        await waitUntil(() => scope.isDone());
      });

      it("posts to local task service with body", async () => {
        const scope = nock("http://127.0.0.1").post("/tasks/local-task", { some: "data" }).reply(204);
        await taskQueueService.enqueue<TestPayload>("local-task", { data: { some: "data" } });
        await waitUntil(() => scope.isDone());
      });

      it("local task enqueues even if downstream execution fails", async () => {
        const scope = nock("http://127.0.0.1").post("/tasks/local-task", { some: "data" }).reply(500);
        await taskQueueService.enqueue<TestPayload>("local-task", { data: { some: "data" } });
        await waitUntil(() => scope.isDone());
      });

      it("ignores leading slash on task name", async () => {
        const scope = nock("http://127.0.0.1").post("/tasks/local-task").reply(204);
        await taskQueueService.enqueue("/local-task");
        await waitUntil(() => scope.isDone());
      });

      interface TestPayload {
        some: string;
      }
    });

    describe("local queue custom prefix", () => {
      beforeEach(() => {
        process.env.GAEJS_ENVIRONMENT = "local";
        taskQueueService = new TaskQueueService({ queueName: "default", pathPrefix: "/admin/tasks" });
      });

      it("posts to local task service", async () => {
        const scope = nock("http://127.0.0.1").post("/admin/tasks/local-task").reply(204);
        await taskQueueService.enqueue("local-task");
        await waitUntil(() => scope.isDone());
      });

      it("posts to local task service with body", async () => {
        const scope = nock("http://127.0.0.1").post("/admin/tasks/local-task", { some: "data" }).reply(204);
        await taskQueueService.enqueue("local-task", { data: { some: "data" } });
        await waitUntil(() => scope.isDone());
      });

      it("ignores leading slash on task name", async () => {
        const scope = nock("http://127.0.0.1").post("/admin/tasks/local-task").reply(204);
        await taskQueueService.enqueue("/local-task");
        await waitUntil(() => scope.isDone());
      });
    });
  });
});
