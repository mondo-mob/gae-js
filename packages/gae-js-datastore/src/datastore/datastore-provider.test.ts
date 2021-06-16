import { Datastore } from "@google-cloud/datastore";
import { connectDatastore, initTestConfig } from "./test-utils";
import { DatastoreProvider } from "./datastore-provider";

describe("DatastoreProvider", () => {
  beforeAll(async () => {
    await initTestConfig();
  });

  it("auto inits datastore from env config", async () => {
    const provider = new DatastoreProvider();
    provider.init();
    expect(provider.get()).toBeInstanceOf(Datastore);
  });

  it("inits from existing instance", async () => {
    const provider = new DatastoreProvider();
    const datastore = connectDatastore();
    provider.init(datastore);
    expect(provider.get()).toBe(datastore);
  });
});
