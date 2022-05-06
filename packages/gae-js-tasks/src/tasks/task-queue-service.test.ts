import nock from "nock";
import { initTestConfig, waitUntil } from "../__test/test-utils";
import { TaskQueueService } from "./task-queue-service";

describe("TaskQueueService", () => {
  let taskQueueService: TaskQueueService;

  beforeEach(async () => {
    await initTestConfig();
    nock.disableNetConnect();
  });

  afterEach(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe("enqueue", () => {
    describe("local queue default config", () => {
      beforeEach(() => {
        process.env.GAEJS_ENVIRONMENT = "local";
        taskQueueService = new TaskQueueService();
      });

      it("posts to local task service", async () => {
        const scope = nock("http://localhost").post("/tasks/local-task").reply(204);
        await taskQueueService.enqueue("local-task");
        await waitUntil(() => scope.isDone());
      });

      it("posts to local task service with body", async () => {
        const scope = nock("http://localhost").post("/tasks/local-task", { some: "data" }).reply(204);
        await taskQueueService.enqueue("local-task", { some: "data" });
        await waitUntil(() => scope.isDone());
      });

      it("local task enqueues even if downstream execution fails", async () => {
        const scope = nock("http://localhost").post("/tasks/local-task", { some: "data" }).reply(500);
        await taskQueueService.enqueue("local-task", { some: "data" });
        await waitUntil(() => scope.isDone());
      });
    });

    describe("local queue custom prefix", () => {
      beforeEach(() => {
        process.env.GAEJS_ENVIRONMENT = "local";
        taskQueueService = new TaskQueueService({ queueName: "default", pathPrefix: "/admin/tasks" });
      });

      it("posts to local task service", async () => {
        const scope = nock("http://localhost").post("/admin/tasks/local-task").reply(204);
        await taskQueueService.enqueue("local-task");
        await waitUntil(() => scope.isDone());
      });

      it("posts to local task service with body", async () => {
        const scope = nock("http://localhost").post("/admin/tasks/local-task", { some: "data" }).reply(204);
        await taskQueueService.enqueue("local-task", { some: "data" });
        await waitUntil(() => scope.isDone());
      });
    });
  });
});
