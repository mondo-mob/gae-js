import { Firestore } from "@google-cloud/firestore";
import { initEmulatorConfig } from "../__test/test-utils";
import { FirestoreProvider } from "./firestore-provider";
import { connectFirestore } from "./connect";

describe("FirestoreProvider", () => {
  beforeAll(async () => {
    await initEmulatorConfig();
  });

  it("auto inits firestore from env config", async () => {
    const provider = new FirestoreProvider();
    provider.init();
    expect(provider.get()).toBeInstanceOf(Firestore);
  });

  it("inits from existing instance", async () => {
    const provider = new FirestoreProvider();
    const firestore = connectFirestore();
    provider.init(firestore);
    expect(provider.get()).toBe(firestore);
  });
});
