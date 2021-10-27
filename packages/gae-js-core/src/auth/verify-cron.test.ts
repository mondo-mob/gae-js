import express from "express";
import request from "supertest";
import { verifyCron } from "./verify-cron";

const initApp = () => {
  const app = express();
  app.use(verifyCron);
  app.get("/", (req, res) => res.send("OK"));
  return app;
};

describe("verifyCron", () => {
  const app = initApp();

  it("allows request with x-appengine-cron", async () => {
    await request(app).get("/").set("x-appengine-cron", "true").expect(200, "OK");
  });

  it("rejects request without x-appengine-cron header", async () => {
    await request(app).get("/").expect(403);
  });
});
