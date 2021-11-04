import { FieldPath, OrderByDirection, WhereFilterOp } from "@google-cloud/firestore";
import { OneOrMany } from "@dotrun/gae-js-core";

export interface WhereFilter {
  fieldPath: string | FieldPath;
  opStr: WhereFilterOp;
  value: any;
}

export interface PropertySort<T> {
  property: (keyof T | "__name__") & string;
  direction?: OrderByDirection;
}

export interface QueryOptions<T> {
  filters: WhereFilter[];
  select: OneOrMany<keyof T & string>;
  sort: OneOrMany<PropertySort<T>>;
  startAfter: any[];
  startAt: any[];
  endBefore: any[];
  endAt: any[];
  offset: number;
  limit: number;
}

export type QueryResponse<T> = ReadonlyArray<T>;
