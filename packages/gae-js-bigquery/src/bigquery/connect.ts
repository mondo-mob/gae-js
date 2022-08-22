import { BigQuery, BigQueryOptions } from "@google-cloud/bigquery";
import { configurationProvider, createLogger } from "@mondomob/gae-js-core";
import { GaeJsBigQueryConfiguration } from "../configuration";

export interface BigQueryConnectOptions {
  configuration?: GaeJsBigQueryConfiguration;
  bigQueryOptions?: BigQueryOptions;
}

export const connectBigQuery = (options?: BigQueryConnectOptions): BigQuery => {
  const logger = createLogger("connectBigQuery");
  const configuration = options?.configuration || configurationProvider.get<GaeJsBigQueryConfiguration>();

  logger.info("Initialising BigQuery");
  const bigQueryOptions: BigQueryOptions = {
    projectId: configuration.bigQuery?.projectId || configuration.projectId,
    ...options?.bigQueryOptions,
  };

  return new BigQuery(bigQueryOptions);
};
