import { BigQuery } from "@google-cloud/bigquery";
import { connectBigQuery } from "./connect";
import { initTestConfig } from "../__test/test-utils";

jest.mock("@google-cloud/bigquery");

describe("connectBigQuery", () => {
  it("connects to app project by default", async () => {
    await initTestConfig();
    connectBigQuery();
    expect(BigQuery).toHaveBeenLastCalledWith({
      projectId: "bigquery-tests",
    });
  });

  it("will connect to bigquery.projectId if provided", async () => {
    await initTestConfig({ bigQuery: { projectId: "bigquery-project-override" } });
    connectBigQuery();
    expect(BigQuery).toHaveBeenLastCalledWith({
      projectId: "bigquery-project-override",
    });
  });

  it("will connect will custom properties", async () => {
    await initTestConfig();
    connectBigQuery({
      bigQueryOptions: {
        projectId: "custom-project",
        autoRetry: false,
      },
    });
    expect(BigQuery).toHaveBeenLastCalledWith({
      projectId: "custom-project",
      autoRetry: false,
    });
  });
});
