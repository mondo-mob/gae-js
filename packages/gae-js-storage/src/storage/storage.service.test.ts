import { StorageService } from "./storage.service";
import { storageProvider } from "./storage-provider";
import { initTestConfig } from "../__test/test-utils";

// TODO: This connects to the storage emulator but this currently only supports firebase functionality and
//       so can't be used for most gcloud related functions. Hopefully will be improved soon...
//       NOTE: Ignored test for getDefaultBucketSignedDownloadUrl due to https://github.com/firebase/firebase-tools/issues/3400
describe("StorageService", () => {
  let service: StorageService;

  beforeAll(async () => {
    await initTestConfig();
    storageProvider.init();
  });
  beforeEach(async () => {
    service = new StorageService();
    jest.clearAllMocks();
  });

  it("inits default bucket from config", async () => {
    expect(service.defaultBucket.name).toEqual("test-bucket");
  });

  it("creates resumable upload url", async () => {
    const uploadUrl = await service.getDefaultBucketResumableUploadUrl("12345");
    expect(uploadUrl.includes("upload/storage/v1/b/test-bucket/o")).toBeTruthy();
  });

  it("creates resumable upload url with content-type", async () => {
    const uploadUrl = await service.getDefaultBucketResumableUploadUrl("12345", {
      metadata: { contentType: "text/plain" },
    });
    expect(uploadUrl.includes("upload/storage/v1/b/test-bucket/o")).toBeTruthy();
  });
});
