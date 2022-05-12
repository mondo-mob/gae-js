import { FieldPath, OrderByDirection, WhereFilterOp } from "@google-cloud/firestore";
import { OneOrMany } from "@mondomob/gae-js-core";
import { FIRESTORE_ID_FIELD } from "./firestore-constants";

export interface WhereFilter {
  fieldPath: string | FieldPath;
  opStr: WhereFilterOp;
  value: any;
}

export interface PropertySort<T> {
  property: (keyof T | typeof FIRESTORE_ID_FIELD) & string;
  direction?: OrderByDirection;
}

export interface QueryOptions<T> {
  filters: WhereFilter[];
  select: OneOrMany<(keyof T & string) | typeof FIRESTORE_ID_FIELD>;
  sort: OneOrMany<PropertySort<T>>;
  startAfter: any[];
  startAt: any[];
  endBefore: any[];
  endAt: any[];
  offset: number;
  limit: number;
}

export type QueryResponse<T> = ReadonlyArray<T>;
