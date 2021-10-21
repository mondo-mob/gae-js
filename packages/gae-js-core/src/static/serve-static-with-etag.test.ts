import express from "express";
import request from "supertest";
import { serveStaticWithEtag } from "./serve-static-with-etag";
import { generateHash } from "./utils";

const initApp = () => {
  const app = express();
  app.use(serveStaticWithEtag("src/static"));
  app.get("/", (req, res) => res.send("NOT STATIC"));
  return app;
};

describe("serveStaticWithEtag", () => {
  const app = initApp();

  it("returns known file with etag", async () => {
    const expectedHash = await generateHash("src/static/index.ts");
    await request(app).get("/index.ts").expect(200).expect("etag", `"${expectedHash}"`);
  });

  it("returns known file without last-modified header", async () => {
    await request(app)
      .get("/index.ts")
      .expect(200)
      .expect((res) => expect(res.headers["last-modified"]).toBeUndefined());
  });

  it("passes through request for unrecognised file", async () => {
    await request(app).get("/").expect(200).expect("NOT STATIC");
  });
});
