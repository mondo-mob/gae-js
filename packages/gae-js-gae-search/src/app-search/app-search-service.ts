import * as AppSearchClient from "@elastic/app-search-node";
import { prepareDocument } from "./index-mapper";
import { normaliseFieldName, prepareFilters } from "./query-mapper";
import { createLogger, IndexEntry, Page, QueryResults, SearchFields, SearchService, Sort } from "@mondomob/gae-js-core";

const normaliseEngineName = (entityName: string) => entityName.toLowerCase();

export class AppSearchService extends SearchService {
  private logger = createLogger("appsearch-service");
  private client: any;

  constructor() {
    super();
    // TODO: Pull from config
    const host = "http://localhost:3002/api/as/v1/";
    const apiKey = "private-g8u7mo577skgqha958zaevja";
    this.client = new AppSearchClient(undefined, apiKey, () => host);
  }

  async index(entityName: string, entries: IndexEntry[]) {
    this.logger.info(`Indexing ${entries.length} ${entityName} entities`);
    const engineName = normaliseEngineName(entityName);
    const documents = entries.map(prepareDocument);
    return this.client.indexDocuments(engineName, documents).catch((error: any) => console.log(error));
  }

  async delete(entityName: string, ...ids: string[]) {
    this.logger.info(`Deleting ${ids.length} ${entityName} entities`);
    const engineName = normaliseEngineName(entityName);
    return this.client.destroyDocuments(engineName, ids);
  }

  async deleteAll(entityName: string) {
    // TODO: Need to list all and then delete them in batches
    // const engineName = 'favorite-videos'
    // const documentIds = ['INscMGmhmX4', 'JNDFojsd02']
    //
    // client
    //   .destroyDocuments(engineName, documentIds)
    //   .then(response => console.log(response))
    //   .catch(error => console.log(error.errorMessages))
  }

  async query(entityName: string, fields: SearchFields, sort?: Sort, page?: Page): Promise<QueryResults> {
    const engineName = normaliseEngineName(entityName);
    const query = "";
    const filters = prepareFilters(fields);
    const resultFields = { id: { raw: {} } };
    const options: any = { filters, result_fields: resultFields };

    if (sort) {
      options.sort = {
        [normaliseFieldName(sort.field)]: sort.descending ? "desc" : "asc",
      };
    }

    if (page && page.limit) {
      options.page = {
        size: page.limit,
        current: Math.max(1, page.offset / page.limit + 1),
      };
    }

    console.log("options", JSON.stringify(options));
    const result = await this.client.search(engineName, query, options).catch((error: any) => console.log(error));

    return {
      resultCount: result.meta.page.total_results,
      ids: result.results.map((r: any) => r.id.raw),
      limit: result.meta.page.size,
      offset: result.meta.page.size * (result.meta.page.current - 1),
    };
  }
}
