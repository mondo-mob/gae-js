import express, { Router } from "express";
import request from "supertest";
import { routeNotFound } from "./route-not-found";

const initApp = () => {
  const apiRouter = Router();
  apiRouter.get("/message", (req, res) => {
    res.send("API MESSAGE");
  });
  apiRouter.use(routeNotFound("Invalid API request"));

  const app = express();
  app.use("/api", apiRouter);
  app.use("/message", (req, res) => {
    res.send("MESSAGE");
  });
  app.use("/*", (req, res) => {
    res.send("FALLBACK");
  });
  return app;
};

describe("routeNotFound", () => {
  const app = initApp();

  it("doesn't affect valid routes", async () => {
    await request(app).get("/message").expect(200, "MESSAGE");
    await request(app).get("/api/message").expect(200, "API MESSAGE");
  });

  it("doesn't affect valid fallback requests", async () => {
    await request(app).get("/give-me-the-fallback").expect(200, "FALLBACK");
  });

  it("returns not found for invalid api request", async () => {
    await request(app).get("/api/give-me-the-fallback").expect(404);
  });
});
