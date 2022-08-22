import { BigQuery } from "@google-cloud/bigquery";
import { BigQueryProvider } from "./bigquery-provider";
import { connectBigQuery } from "./connect";
import { initTestConfig } from "../__test/test-utils";

jest.mock("@google-cloud/bigquery");

describe("BigQueryProvider", () => {
  beforeAll(async () => {
    await initTestConfig();
  });

  it("auto inits bigquery from env config", async () => {
    const provider = new BigQueryProvider();
    provider.init();
    expect(provider.get()).toBeInstanceOf(BigQuery);
  });

  it("inits from existing instance", async () => {
    const provider = new BigQueryProvider();
    const bigQuery = connectBigQuery();
    provider.init(bigQuery);
    expect(provider.get()).toBe(bigQuery);
  });
});
