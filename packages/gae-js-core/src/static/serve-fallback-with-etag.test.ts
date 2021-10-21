import express from "express";
import request from "supertest";
import { generateHash } from "./utils";
import { serveFallbackWithEtag } from "./serve-fallback-with-etag";

const initApp = () => {
  const app = express();
  app.get("/notfallback", (req, res, next) => {
    // contrived example to marked headersSent flag to true
    res.writeHead(200, { "Content-Type": "text/plain" });
    next();
  });
  app.use("/*", serveFallbackWithEtag("src/static/index.ts"));
  app.get("/notfallback", (req, res) => {
    res.write("NOT FALLBACK");
    res.end();
  });
  return app;
};

describe("serveFallbackWithEtag", () => {
  const app = initApp();

  it("returns fallback file with etag", async () => {
    const expectedHash = await generateHash("src/static/index.ts");
    await request(app).get("/unspecified_path").expect(200).expect("etag", `"${expectedHash}"`);
  });

  it("returns fallback file without last-modified header", async () => {
    await request(app)
      .get("/unspecified_path")
      .expect(200)
      .expect((res) => expect(res.headers["last-modified"]).toBeUndefined());
  });

  it("does not interfere when headers already sent", async () => {
    await request(app).get("/notfallback").expect(200).expect("NOT FALLBACK");
  });
});
