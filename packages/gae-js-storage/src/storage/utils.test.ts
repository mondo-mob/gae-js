import { BadRequestError } from "@mondomob/gae-js-core";
import { gcsPathJoin, parseGcsUri } from "./utils";

describe("Storage Utils", () => {
  describe("parseGcsUri", () => {
    it("parses root level object", () => {
      expect(parseGcsUri("gs://my-bucket/my-object")).toEqual({ bucket: "my-bucket", name: "my-object" });
    });

    it("parses nested object", () => {
      expect(parseGcsUri("gs://my-bucket/my-folder1/my-folder2/my-object")).toEqual({
        bucket: "my-bucket",
        name: "my-folder1/my-folder2/my-object",
      });
    });

    it("throws for invalid uri", () => {
      expect(() => parseGcsUri("https://my-bucket/my-folder")).toThrow(BadRequestError);
      expect(() => parseGcsUri("gs://my$bucket/my-object")).toThrow(BadRequestError);
    });
  });

  describe("gcsPathJoin", () => {
    it("joins elements together with forward slash", () => {
      expect(gcsPathJoin("one", "two", "three.jpg")).toBe("one/two/three.jpg");
    });

    it("excludes empty string elements", () => {
      expect(gcsPathJoin("", "", "three.jpg")).toBe("three.jpg");
    });

    it("removes redundant slashes", () => {
      expect(gcsPathJoin("/one/", "/two", "/", "three.jpg")).toBe("one/two/three.jpg");
    });
  });
});
