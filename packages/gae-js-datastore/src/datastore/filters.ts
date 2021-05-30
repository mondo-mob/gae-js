import { asArray, OneOrMany } from "@dotrun/gae-js-core";
import { Operator } from "@google-cloud/datastore/build/src/query";

export type Filter<T> = OneOrMany<T | ComplexFilter<T>>;

export interface ComplexFilter<T> {
  op: Operator;
  value: T;
}

// This is way more complicated than ideal but required in order to prevent union types
// being distributed over the conditional types.
// https://github.com/Microsoft/TypeScript/issues/29368#issuecomment-453529532
// eslint-disable-next-line @typescript-eslint/ban-types
type FilterType<T> = [T] extends [Date] ? Filter<T> : [T] extends [object] ? Filters<T> : Filter<T>;

// eslint-disable-next-line @typescript-eslint/ban-types
type FilterArray<T extends any[]> = T[0] extends object ? Filters<T[0]> : FilterType<T[0]>;

export type Filters<T> = {
  [K in keyof T]?: T[K] extends any[] ? FilterArray<T[K]> : FilterType<T[K]>;
};

export function isComplexFilter<T>(filter: Filter<T>): filter is ComplexFilter<T> {
  return (filter as any).op !== undefined;
}

interface Query {
  filter(path: string, operation: Operator, value: any): this;
  filter(path: string, value: any): this;
}

export const buildFilters = <T, Q extends Query>(query: Q, filters: Filters<T>, pathPrefix = ""): Q => {
  return Object.entries(filters).reduce<Query>((q, [key, value]) => {
    if (!isComplexFilter(value) && typeof value === "object" && !Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return buildFilters(query, value!, pathPrefix + `${key}.`);
    }

    const parameterFilters = asArray(value);

    for (const filter of parameterFilters) {
      if (isComplexFilter(filter)) {
        q = q.filter(pathPrefix + key, filter.op, filter.value);
      } else {
        q = q.filter(pathPrefix + key, filter);
      }
    }

    return q;
  }, query) as Q;
};
