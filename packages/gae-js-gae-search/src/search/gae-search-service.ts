import fetch, { Response } from "node-fetch";
import {
  configurationStore,
  createLogger,
  IndexEntry,
  isPredicate,
  isPredicateArray,
  Page,
  Predicate,
  QueryResults,
  SearchFields,
  SearchService,
  Sort,
} from "@dotrun/gae-js-core";
import { GaeJsGaeSearchConfiguration } from "../configuration";

export interface SearchPredicate extends Predicate {
  field: string;
}

/**
 * SearchService implementation that uses the GAE Search API via the
 * https://github.com/mondo-mob/gae-search-service GAE Search Service proxy.
 */
export class GaeSearchService extends SearchService {
  private logger = createLogger("gae-search-service");
  private readonly searchServiceEndpoint: string;

  constructor() {
    super();
    const configuration = configurationStore.get<GaeJsGaeSearchConfiguration>();
    if (!configuration.searchServiceEndpoint) {
      throw new Error("searchServiceEndpoint must be configured in order to use the SearchService");
    }
    this.searchServiceEndpoint = configuration.searchServiceEndpoint;
  }

  index(entityName: string, entries: IndexEntry[]): Promise<Response> {
    this.logger.info(`Indexing ${entries.length} ${entityName} entities`);

    return this.post("/index", {
      entityName,
      entries,
    });
  }

  delete(entityName: string, ...ids: string[]): Promise<Response> {
    return this.post("/delete", {
      entityName,
      ids,
    });
  }

  deleteAll(entityName: string): Promise<Response> {
    return this.post("/deleteAll", {
      entityName,
    });
  }

  async query(entityName: string, fields: SearchFields, sort?: Sort, page?: Page): Promise<QueryResults> {
    const resp = await this.post("/query", {
      entityName,
      fields: this.normaliseFields(fields),
      sort,
      page,
    });

    const queryResults = await resp.json();
    this.logger.info(`Query returned ${queryResults.ids.length} ids of total ${queryResults.resultCount}`);
    return queryResults;
  }

  private post(path: string, body: unknown): Promise<Response> {
    return fetch(this.searchServiceEndpoint + path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  private normaliseFields(fields: SearchFields): SearchPredicate[] {
    return Object.keys(fields).reduce((result: SearchPredicate[], key) => {
      const field = fields[key];
      if (isPredicateArray(field)) {
        field.forEach((predicate) => result.push(this.toSearchPredicate(key, predicate)));
      } else {
        result.push(this.toSearchPredicate(key, field));
      }
      return result;
    }, []);
  }

  private toSearchPredicate(fieldName: string, input: string | string[] | Predicate): SearchPredicate {
    return isPredicate(input)
      ? {
          field: fieldName,
          op: input.op,
          value: input.value,
        }
      : {
          field: fieldName,
          op: "=",
          value: input,
        };
  }
}
