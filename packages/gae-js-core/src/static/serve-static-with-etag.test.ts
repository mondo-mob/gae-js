import express from "express";
import request from "supertest";
import { serveStaticWithEtag, StaticEtagOptions } from "./serve-static-with-etag";
import { generateHash } from "./utils";

const initApp = ({ folder = "src/static", options }: { folder?: string; options?: StaticEtagOptions } = {}) => {
  const app = express();
  app.use(serveStaticWithEtag(folder, options));
  app.get("/", (req, res) => res.send("NOT STATIC"));
  return app;
};

describe("serveStaticWithEtag", () => {
  it("returns known file with etag", async () => {
    const app = initApp();
    const expectedHash = await generateHash("src/static/index.ts");
    await request(app).get("/index.ts").expect(200).expect("etag", `"${expectedHash}"`);
  });

  it("ignores paths provided by config and omits logs with quiet mode", async () => {
    const app = initApp({
      options: {
        ignorePaths: ["/index.ts"],
        quiet: true,
      },
    });
    await request(app).get("/index.ts").expect(404);
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
    const app = initApp({
      folder: "not-a-folder",
    });

    await request(app).get("/").expect(200).expect("NOT STATIC");
  });
});
