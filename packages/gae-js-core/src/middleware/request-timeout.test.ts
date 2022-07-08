import express, { Handler } from "express";
import request from "supertest";
import { requestTimeoutMinutes, requestTimeoutSeconds } from "./request-timeout";
import { asyncHandler } from "./async-middleware";

const sendTimeoutValue: Handler = (req, res) => {
  return res.json({ timeout: (req as any).socket.timeout });
};

const initApp = () => {
  const app = express();
  app.get("/default", sendTimeoutValue);
  app.get("/secs", requestTimeoutSeconds(10), sendTimeoutValue);
  app.get("/mins", requestTimeoutMinutes(10), sendTimeoutValue);
  app.get(
    "/tooslow",
    requestTimeoutSeconds(0.01),
    asyncHandler(() => new Promise((res) => setTimeout(res, 200)))
  );
  return app;
};

describe("requestTimeout", () => {
  const app = initApp();

  it("doesn't affect default", async () => {
    // Node12 used to specifically set the timeout of 120s on the socket but Node14 leaves it undefined
    await request(app).get("/default").expect(200, {});
  });

  it("sets request timeout in seconds", async () => {
    await request(app).get("/secs").expect(200, { timeout: 10000 });
  });

  it("sets request timeout in minutes", async () => {
    await request(app).get("/mins").expect(200, { timeout: 600000 });
  });

  it("errors if request too long", async () => {
    await request(app).get("/tooslow").expect(500);
  });
});
