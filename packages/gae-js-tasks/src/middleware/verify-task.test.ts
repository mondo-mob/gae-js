import express from "express";
import request from "supertest";
import { verifyTask } from "./verify-task";

const initApp = () => {
  const app = express();
  app.use("/tasks", verifyTask);
  app.get("/tasks/task1", (req, res) => res.send("OK"));
  return app;
};

describe("verifyTask", () => {
  const app = initApp();

  it("allows request with x-appengine-taskname", async () => {
    await request(app).get("/tasks/task1").set("x-appengine-taskname", "poll-status").expect(200, "OK");
  });

  it("rejects request without x-appengine-taskname header", async () => {
    await request(app).get("/tasks/task1").expect(403);
  });
});
