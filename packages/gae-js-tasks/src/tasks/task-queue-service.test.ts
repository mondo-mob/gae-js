import nock from "nock";
import { initTestConfig, waitUntil } from "../__test/test-utils";
import { TaskQueueService } from "./task-queue-service";
import { CloudTasksClient } from "@google-cloud/tasks";
import { withEnvVars } from "@mondomob/gae-js-core/dist/__test/test-utils";
import { ENV_VAR_RUNTIME_ENVIRONMENT } from "@mondomob/gae-js-core";
import { tasksProvider } from "./tasks-provider";
import { TaskThrottle } from "./types";

jest.mock("@google-cloud/tasks");

describe("TaskQueueService", () => {
  let taskQueueService: TaskQueueService;

  beforeEach(async () => {
    await initTestConfig();
    jest.useFakeTimers({ now: new Date("2023-10-11T12:13:14.000Z"), advanceTimers: true });
  });
  afterEach(() => {
    jest.useRealTimers();
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

      it(
        "creates http target task params for host override routing",
        withEnvVars({ [ENV_VAR_RUNTIME_ENVIRONMENT]: "appengine" }, async () => {
          tasksProvider.init();
          taskQueueService = new TaskQueueService({
            httpTargetHost: "https://my-host.com",
            oidcToken: {
              serviceAccountEmail: "sacount@gnet.com",
              audience: "my-audience",
            },
          });

          await taskQueueService.enqueue("test-task", { data: { key: "value1" } });

          expectTaskParams({
            httpRequest: {
              url: "https://my-host.com/tasks/test-task",
              headers: {
                "Content-Type": "application/json",
              },
              body: Buffer.from(JSON.stringify({ key: "value1" })).toString("base64"),
              oidcToken: { serviceAccountEmail: "sacount@gnet.com", audience: "my-audience" },
            },
          });
        })
      );

      it(
        "creates http target task params for host override routing without auth",
        withEnvVars({ [ENV_VAR_RUNTIME_ENVIRONMENT]: "appengine" }, async () => {
          tasksProvider.init();
          taskQueueService = new TaskQueueService({ httpTargetHost: "https://my-host.com" });

          await taskQueueService.enqueue("test-task", { data: { key: "value1" } });

          expectTaskParams({
            httpRequest: {
              url: "https://my-host.com/tasks/test-task",
              headers: {
                "Content-Type": "application/json",
              },
              body: Buffer.from(JSON.stringify({ key: "value1" })).toString("base64"),
            },
          });
        })
      );

      it(
        "creates task params for throttling",
        withEnvVars({ [ENV_VAR_RUNTIME_ENVIRONMENT]: "appengine" }, async () => {
          tasksProvider.init();
          taskQueueService = new TaskQueueService({
            tasksRoutingService: "backend",
          });

          await taskQueueService.enqueue("test-task", {
            data: { key: "value1" },
            throttle: { suffix: "test", periodMs: 300000 },
          });

          expectTaskParams({
            // Mocked service returns null for queue path
            name: "undefined/tasks/400ad748ea637cadef739cd026c3c1df_test",
            appEngineHttpRequest: {
              relativeUri: "/tasks/test-task",
              headers: { "Content-Type": "application/json" },
              body: Buffer.from(JSON.stringify({ key: "value1" })).toString("base64"),
              appEngineRouting: {
                service: "backend",
              },
            },
            scheduleTime: {
              seconds: 1697026500,
            },
          });
        })
      );

      it(
        "ignores ALREADY_EXISTS error for throttled task",
        withEnvVars({ [ENV_VAR_RUNTIME_ENVIRONMENT]: "appengine" }, async () => {
          tasksProvider.init();
          jest.spyOn(tasksProvider.get(), "createTask").mockImplementation(() => {
            throw { code: 6, details: "Requested entity already exists" };
          });

          await new TaskQueueService().enqueue("test-task", {
            throttle: { suffix: "test", periodMs: 300000 },
          });
        })
      );

      it(
        "throws non ALREADY_EXISTS errors for throttled task",
        withEnvVars({ [ENV_VAR_RUNTIME_ENVIRONMENT]: "appengine" }, async () => {
          tasksProvider.init();
          jest.spyOn(tasksProvider.get(), "createTask").mockImplementation(() => {
            throw { code: 3, details: "Invalid argument" };
          });

          await expect(
            new TaskQueueService().enqueue("test-task", {
              throttle: { suffix: "test", periodMs: 300000 },
            })
          ).rejects.toEqual({ code: 3, details: "Invalid argument" });
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
        jest.advanceTimersByTime(5000);
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

      it("posts to local task service given httpTargetHost override", async () => {
        const scope = nock("http://127.0.0.1").post("/tasks/local-task").reply(204);
        taskQueueService = new TaskQueueService({ httpTargetHost: "https://my-host.com" });
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

  describe("throttling", () => {
    const expectSlot = (time: string, slot: string, options: TaskThrottle) => {
      const date = "2023-06-13";
      const now = new Date(`${date}T${time}.000Z`);
      const scheduleTime = taskQueueService["calculateThrottleWindow"](now, options);
      expect(new Date(scheduleTime).toISOString()).toEqual(`${date}T${slot}.000Z`);
    };

    it("calculates throttle slots", async () => {
      process.env.GAEJS_ENVIRONMENT = "local";
      taskQueueService = new TaskQueueService();

      // Standard
      expectSlot("21:09:01", "21:10:00", { suffix: "test", periodMs: 60000 });
      expectSlot("21:09:30", "21:10:00", { suffix: "test", periodMs: 60000 });
      expectSlot("21:09:50", "21:10:00", { suffix: "test", periodMs: 60000 });
      expectSlot("21:09:55", "21:10:00", { suffix: "test", periodMs: 60000 });
      expectSlot("21:09:58", "21:10:00", { suffix: "test", periodMs: 60000, bufferMs: 2000 });

      // Within buffer
      expectSlot("21:09:56", "21:11:00", { suffix: "test", periodMs: 60000 });
      expectSlot("21:09:59", "21:11:00", { suffix: "test", periodMs: 60000, bufferMs: 2000 });

      // With offset
      expectSlot("21:09:40", "21:10:30", { suffix: "test", periodMs: 60000, offsetMs: 30000 });
      expectSlot("21:09:56", "21:10:30", { suffix: "test", periodMs: 60000, offsetMs: 30000 });
      expectSlot("21:09:56", "21:10:30", { suffix: "test", periodMs: 60000, bufferMs: 2000, offsetMs: 30000 });
      expectSlot("21:10:29", "21:11:30", { suffix: "test", periodMs: 60000, bufferMs: 2000, offsetMs: 30000 });
    });
  });
});
