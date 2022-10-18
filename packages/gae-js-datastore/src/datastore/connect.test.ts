import { Datastore, DatastoreAdminClient } from "@google-cloud/datastore";
import { ENV_VAR_RUNTIME_ENVIRONMENT } from "@mondomob/gae-js-core";
import { withEnvVars } from "@mondomob/gae-js-core/dist/__test/test-utils";
import { connectDatastore, connectDatastoreAdmin } from "./connect";
import { initEmulatorConfig, initTestConfig } from "../__test/test-utils";

jest.mock("@google-cloud/datastore");

describe("connect", () => {
  describe("connectDatastore", () => {
    it(
      "connects to default project when running on gcp",
      withEnvVars({ [ENV_VAR_RUNTIME_ENVIRONMENT]: "appengine" }, async () => {
        await initTestConfig();

        connectDatastore();

        expect(Datastore).toHaveBeenLastCalledWith({ projectId: undefined });
      })
    );

    it("connects to app projectId if not running on gcp", async () => {
      await initTestConfig();

      connectDatastore();

      expect(Datastore).toHaveBeenLastCalledWith({ projectId: "datastore-tests" });
    });

    it("will connect to datastore projectId if provided", async () => {
      await initTestConfig({ datastoreProjectId: "datastore-project-override" });

      connectDatastore();

      expect(Datastore).toHaveBeenLastCalledWith({ projectId: "datastore-project-override" });
    });

    it("will connect to emulator with dummy credentials if host provided", async () => {
      await initEmulatorConfig();

      connectDatastore();

      expect(Datastore).toHaveBeenLastCalledWith({
        projectId: "datastore-tests",
        apiEndpoint: "localhost:8081",
        credentials: {
          client_email: "datastore@example.com",
          private_key: "{}",
        },
      });
    });

    it("will connect with custom datastore options", async () => {
      await initTestConfig({ datastoreProjectId: "datastore-project-override" });

      connectDatastore({
        datastoreOptions: {
          projectId: "custom-project",
          namespace: "custom-namespace",
        },
      });

      expect(Datastore).toHaveBeenLastCalledWith({
        projectId: "custom-project",
        namespace: "custom-namespace",
      });
    });
  });

  describe("connectDatastoreAdmin", () => {
    it(
      "connects to default project when running on gcp",
      withEnvVars({ [ENV_VAR_RUNTIME_ENVIRONMENT]: "appengine" }, async () => {
        await initTestConfig();

        connectDatastoreAdmin();

        expect(DatastoreAdminClient).toHaveBeenLastCalledWith({ projectId: undefined });
      })
    );

    it("connects to app projectId if not running on gcp", async () => {
      await initTestConfig();

      connectDatastoreAdmin();

      expect(DatastoreAdminClient).toHaveBeenLastCalledWith({ projectId: "datastore-tests" });
    });

    it("will connect to datastore projectId if provided", async () => {
      await initTestConfig({ datastoreProjectId: "datastore-project-override" });

      connectDatastoreAdmin();

      expect(DatastoreAdminClient).toHaveBeenLastCalledWith({ projectId: "datastore-project-override" });
    });

    it("will connect with custom properties", async () => {
      await initTestConfig({ datastoreProjectId: "datastore-project-override" });

      connectDatastoreAdmin({
        clientOptions: {
          projectId: "custom-project",
          namespace: "custom-namespace",
        },
      });

      expect(DatastoreAdminClient).toHaveBeenLastCalledWith({
        projectId: "custom-project",
        namespace: "custom-namespace",
      });
    });
  });
});
