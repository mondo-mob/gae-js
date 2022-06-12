import express from "express";
import request from "supertest";
import { serveStaticWithEtag } from "./serve-static-with-etag";
import { generateHash } from "./utils";

const initApp = (folder = "src/static") => {
  const app = express();
  app.use(serveStaticWithEtag(folder));
  app.get("/", (req, res) => res.send("NOT STATIC"));
  return app;
};

describe("serveStaticWithEtag", () => {
  it("returns known file with etag", async () => {
    const app = initApp();
    const expectedHash = await generateHash("src/static/index.ts");
    await request(app).get("/index.ts").expect(200).expect("etag", `"${expectedHash}"`);
  });

  it("returns known file without last-modified header", async () => {
    const app = initApp();
    await request(app)
      .get("/index.ts")
      .expect(200)
      .expect((res) => expect(res.headers["last-modified"]).toBeUndefined());
  });

  it("passes through request for unrecognised file", async () => {
    const app = initApp();
    await request(app).get("/").expect(200).expect("NOT STATIC");
  });

  it("ignores invalid folder", async () => {
    const app = initApp("not-a-folder");

    await request(app).get("/").expect(200).expect("NOT STATIC");
  });
});
