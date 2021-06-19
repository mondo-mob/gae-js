export interface IndexEntry {
  id: string;
  fields: { [key: string]: any };
}

export interface Sort {
  field: string;
  descending?: boolean;
}

export interface Page {
  limit: number;
  offset: number;
}

export interface QueryResults {
  resultCount: number;
  limit: number;
  offset: number;
  ids: string[];
}

export declare type Operator = "=" | "!=" | ">" | "<" | ">=" | "<=";

export interface SearchFields {
  [key: string]: string | string[] | Predicate | Predicate[];
}

export interface Predicate {
  op: Operator;
  value: string | string[] | number | Date;
}

export const isPredicate = (value: unknown): value is Predicate => {
  return (value as Predicate).op !== undefined;
};

export const isPredicateArray = (value: unknown): value is Predicate[] => {
  return Array.isArray(value) && value.length > 0 && isPredicate(value[0]);
};

export abstract class SearchService {
  abstract index(indexName: string, entries: IndexEntry[]): Promise<any>;

  abstract delete(indexName: string, ...ids: string[]): Promise<any>;

  abstract deleteAll(indexName: string): Promise<any>;

  abstract query(indexName: string, fields: SearchFields, sort?: Sort, page?: Page): Promise<QueryResults>;
}
