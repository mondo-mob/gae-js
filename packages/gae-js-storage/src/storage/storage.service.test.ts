import { storageProvider } from "./storage-provider";
import { StorageService } from "./storage.service";
import { useStorageTest } from "../__test/useStorageTest.hook";

// TODO: This connects to the storage emulator but this currently only supports firebase functionality and
//       so can't be used for most gcloud related functions. Hopefully will be improved soon...
//       NOTE: Ignored test for getSignedDownloadUrl due to https://github.com/firebase/firebase-tools/issues/3400
describe("StorageService", () => {
  useStorageTest({ clearBuckets: ["test-bucket", "test-bucket2"] });
  let service: StorageService;
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("Service options", () => {
    it("inits bucket from config", async () => {
      service = new StorageService({
        bucketName: "test-bucket",
      });
      expect(service.getBucket().name).toEqual("test-bucket");
    });

    it("inits prefixed bucket from config", async () => {
      service = new StorageService({
        bucketNamePrefix: "test-bucket",
      });
      expect(service.getBucket().name).toEqual("test-bucket-storage-tests");
    });

    it("falls back to project bucket", async () => {
      service = new StorageService();
      expect(service.getBucket().name).toEqual("storage-tests.appspot.com");
    });
  });

  describe("Bucket operations", () => {
    beforeEach(async () => {
      service = new StorageService({
        bucketName: "test-bucket",
      });
    });

    describe("writeFile", () => {
      it("saves file", async () => {
        await service.writeFile({ data: "my file contents", fileName: "testFile" });
        const savedData = await storageProvider.get().bucket("test-bucket").file("testFile").download();
        expect(savedData.toString()).toEqual("my file contents");
      });
    });

    describe("readFile", () => {
      it("reads file", async () => {
        await storageProvider.get().bucket("test-bucket").file("testFile").save("contents to read");
        const read = await service.readFile("testFile");
        expect(read).toEqual("contents to read");
      });
    });

    describe("copyToBucket", () => {
      it("copies file into bucket with original filename", async () => {
        const original = storageProvider.get().bucket("test-bucket2").file("testFile");
        await original.save("copyToBucket file 1");

        await service.copyToBucket(original);

        const savedData = await storageProvider.get().bucket("test-bucket").file("testFile").download();
        expect(savedData.toString()).toEqual("copyToBucket file 1");
      });

      it("copies file into bucket with fileName", async () => {
        const original = storageProvider.get().bucket("test-bucket2").file("testFile");
        await original.save("copyToBucket file 2");

        await service.copyToBucket(original, { fileName: "copiedFile" });

        const savedData = await storageProvider.get().bucket("test-bucket").file("copiedFile").download();
        expect(savedData.toString()).toEqual("copyToBucket file 2");
      });

      it("copies file into bucket with filePath", async () => {
        const original = storageProvider.get().bucket("test-bucket2").file("testFile");
        await original.save("copyToBucket file 3");

        await service.copyToBucket(original, { filePath: "test-path" });

        const savedData = await storageProvider.get().bucket("test-bucket").file("test-path/testFile").download();
        expect(savedData.toString()).toEqual("copyToBucket file 3");
      });
    });

    describe("copyAllToBucket", () => {
      it("copies all into bucket with original filename", async () => {
        const srcBucket = storageProvider.get().bucket("test-bucket2");
        const dstBucket = storageProvider.get().bucket("test-bucket");

        const file1 = srcBucket.file("testFile1");
        await file1.save("copyAll file 1");
        const file2 = srcBucket.file("testFile2");
        await file2.save("copyAll file 2");

        await service.copyAllToBucket([file1, file2]);

        const [allFiles] = await dstBucket.getFiles();
        expect(allFiles.length).toEqual(2);
        expect(await service.readFile("testFile1")).toEqual("copyAll file 1");
        expect(await service.readFile("testFile2")).toEqual("copyAll file 2");
      });

      it("copies all into bucket with path", async () => {
        const srcBucket = storageProvider.get().bucket("test-bucket2");
        const dstBucket = storageProvider.get().bucket("test-bucket");

        const file1 = srcBucket.file("testFile1");
        await file1.save("copyAll file 1");
        const file2 = srcBucket.file("testFile2");
        await file2.save("copyAll file 2");

        await service.copyAllToBucket([file1, file2], { filePath: "test-path" });

        const [allFiles] = await dstBucket.getFiles();
        expect(allFiles.length).toEqual(2);
        expect(await service.readFile("test-path/testFile1")).toEqual("copyAll file 1");
        expect(await service.readFile("test-path/testFile2")).toEqual("copyAll file 2");
      });
    });

    describe("deleteAll", () => {
      it("deletes all files for prefix", async () => {
        const bucket = storageProvider.get().bucket("test-bucket");
        await bucket.file("path1/testFile1").save("delete 1");
        await bucket.file("path2/testFile2").save("delete 2");
        await bucket.file("path1/testFile3").save("delete 3");
        await bucket.file("path2/testFile4").save("delete 4");
        const [beforeFiles] = await bucket.getFiles();
        expect(beforeFiles.length).toEqual(4);

        await service.deleteAll("path1");

        const [afterFiles] = await bucket.getFiles();
        expect(afterFiles.length).toEqual(2);
        expect(await bucket.file("path2/testFile2").exists()).toBeTruthy();
        expect(await bucket.file("path2/testFile4").exists()).toBeTruthy();
      });
    });

    describe("getResumableUploadUrl", () => {
      it("creates resumable upload url", async () => {
        const uploadUrl = await service.getResumableUploadUrl("12345");
        expect(uploadUrl.includes("upload/storage/v1/b/test-bucket/o")).toBeTruthy();
      });

      it("creates resumable upload url with content-type", async () => {
        const uploadUrl = await service.getResumableUploadUrl("12345", {
          metadata: { contentType: "text/plain" },
        });
        expect(uploadUrl.includes("upload/storage/v1/b/test-bucket/o")).toBeTruthy();
      });

      it("creates resumable upload url with encryption key set", async () => {
        const fileSpy = jest.spyOn(service.getBucket(), "file");
        const uploadUrl = await service.getResumableUploadUrl("12345", undefined, {
          kmsKeyName: "test-key",
        });
        expect(uploadUrl.includes("upload/storage/v1/b/test-bucket/o")).toBeTruthy();
        expect(fileSpy).toBeCalledTimes(1);
        expect(fileSpy).toBeCalledWith("12345", { kmsKeyName: "test-key" });
      });
    });
  });
});
