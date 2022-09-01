import { BadRequestError } from "@mondomob/gae-js-core";
import { parseStorageUri } from "./utils";

describe("Storage Utils", () => {
  describe("parseStorageUri", () => {
    it("parses root level object", () => {
      expect(parseStorageUri("gs://my-bucket/my-object")).toEqual({ bucket: "my-bucket", objectName: "my-object" });
    });

    it("parses nested object", () => {
      expect(parseStorageUri("gs://my-bucket/my-folder1/my-folder2/my-object")).toEqual({
        bucket: "my-bucket",
        objectName: "my-folder1/my-folder2/my-object",
      });
    });

    it("throws for invalid uri", () => {
      expect(() => parseStorageUri("https://my-bucket/my-folder")).toThrow(BadRequestError);
      expect(() => parseStorageUri("gs://my$bucket/my-object")).toThrow(BadRequestError);
    });
  });
});
