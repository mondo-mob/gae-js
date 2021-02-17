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
  //     start: string;
  //     end: string;
  offset: number;
  limit: number;
}
