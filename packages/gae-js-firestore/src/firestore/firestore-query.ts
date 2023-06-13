import { FieldPath, Filter, OrderByDirection, WhereFilterOp } from "@google-cloud/firestore";
import { OneOrMany } from "@mondomob/gae-js-core";
import { FIRESTORE_ID_FIELD } from "./firestore-constants";

export interface WhereFilter {
  fieldPath: string | FieldPath;
  opStr: WhereFilterOp;
  value: any;
}

export interface FieldSort {
  fieldPath: string | FieldPath;
  direction?: OrderByDirection;
}

export interface FilterOptions {
  filters?: WhereFilter[] | Filter;
}

export interface QueryOptions<T> extends FilterOptions {
  select?: OneOrMany<(keyof T & string) | typeof FIRESTORE_ID_FIELD>;
  sort?: OneOrMany<FieldSort>;
  startAfter?: any[];
  startAt?: any[];
  endBefore?: any[];
  endAt?: any[];
  offset?: number;
  limit?: number;
}

export type QueryResponse<T> = ReadonlyArray<T>;

export type IdQueryOptions<T> = Omit<QueryOptions<T>, "select">;

export const idOnlyQueryOptions = <T>(options: IdQueryOptions<T>) => {
  return {
    ...options,
    select: [], // the __name__ prop always comes back
  };
};
