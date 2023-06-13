import express from "express";
import request from "supertest";
import { gaeJsCron } from "./gae-js-cron";

const initApp = () => {
  const app = express();
  app.use("/crons", gaeJsCron);
  app.get("/crons/cron1", (req, res) => res.json({ timeout: (req as any).socket.timeout }));
  return app;
};

describe("gaeJsCron", () => {
  const app = initApp();

  it("allows request with x-appengine-cron and sets timeout to 10 mins", async () => {
    await request(app).get("/crons/cron1").set("x-appengine-cron", "true").expect(200, { timeout: 600000 });
  });

  it("rejects request without x-appengine-cron header", async () => {
    await request(app).get("/crons/cron1").expect(403);
  });
});
