import { Datastore } from "@google-cloud/datastore";
import { connectDatastoreEmulator, initEmulatorConfig } from "../__test/test-utils";
import { DatastoreProvider } from "./datastore-provider";

describe("DatastoreProvider", () => {
  beforeAll(async () => initEmulatorConfig());

  it("auto inits datastore from env config", async () => {
    const provider = new DatastoreProvider();
    provider.init();
    expect(provider.get()).toBeInstanceOf(Datastore);
  });

  it("inits from existing instance", async () => {
    const provider = new DatastoreProvider();
    const datastore = connectDatastoreEmulator();
    provider.init(datastore);
    expect(provider.get()).toBe(datastore);
  });
});
