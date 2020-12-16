import { FieldPath, WhereFilterOp } from "@google-cloud/firestore";

export interface WhereFilter {
  fieldPath: string | FieldPath;
  opStr: WhereFilterOp;
  value: any;
}

export interface QueryOptions<T> {
  filters: WhereFilter[];
  //     select: OneOrMany<keyof T & string>;
  //     sort: {
  //         property: keyof T & string;
  //         options?: OrderOptions;
  //     };
  //     groupBy: OneOrMany<keyof T & string>;
  //     start: string;
  //     end: string;
  offset: number;
  limit: number;
}
