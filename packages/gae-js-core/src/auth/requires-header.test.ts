import express from "express";
import request from "supertest";
import { requiresHeader } from "./requires-header";

const initApp = () => {
  const app = express();
  app.use(requiresHeader("x-special"));
  app.get("/", (req, res) => res.send("OK"));
  return app;
};

describe("requiresHeader", () => {
  const app = initApp();

  it("allows request with header", async () => {
    await request(app).get("/").set("x-special", "true").expect(200, "OK");
  });

  it("rejects request without header", async () => {
    await request(app).get("/").set("x-not-so-special", "true").expect(403);
  });
});
