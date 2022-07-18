import { asArray, OneOrMany } from "@mondomob/gae-js-core";
import { Operator } from "@google-cloud/datastore/build/src/query";
import { entity as Entity } from "@google-cloud/datastore/build/src/entity";
import { Key } from "@google-cloud/datastore";

type NotUndefined<T> = T extends undefined ? never : T;

export type Filter<T> = OneOrMany<T | ComplexFilter<T> | null>;

export interface ComplexFilter<T> {
  op: Operator;
  value: NotUndefined<T> | null;
}

// This is way more complicated than ideal but required in order to prevent union types
// being distributed over the conditional types.
// https://github.com/Microsoft/TypeScript/issues/29368#issuecomment-453529532
type FilterType<T> = [NonNullable<T>] extends [Date] | [Key]
  ? Filter<T>
  : [NonNullable<T>] extends [object]
  ? Filters<T>
  : Filter<T>;

type FilterArray<T extends any[] | (any[] | null) | (any[] | null | undefined)> = NonNullable<T>[0] extends object
  ? Filters<NonNullable<T>[0]>
  : FilterType<NonNullable<T>[0]>;

export type Filters<T> = {
  [K in keyof T]?: T[K] extends any[] | (any[] | null) | (any[] | null | undefined)
    ? FilterArray<T[K]>
    : FilterType<T[K]>;
};

export function isComplexFilter<T>(filter: Filter<T>): filter is ComplexFilter<T> {
  return filter != null && (filter as ComplexFilter<T>).op !== undefined;
}

interface Query {
  filter(path: string, operation: Operator, value: any): this;
  filter(path: string, value: any): this;
}

const isNestedObject = (value: unknown): value is Record<string, unknown> => {
  return (
    !isComplexFilter(value) &&
    typeof value === "object" &&
    value !== null &&
    !Entity.isDsKey(value) &&
    !Array.isArray(value)
  );
};

export const buildFilters = <T, Q extends Query>(query: Q, filters: Filters<T>, pathPrefix = ""): Q => {
  return Object.entries(filters).reduce<Query>((q, [key, value]) => {
    if (value === undefined) {
      throw new Error(`Attempt to filter by undefined value for property '${pathPrefix}${key}'`);
    }

    if (isNestedObject(value)) {
      return buildFilters(query, value, pathPrefix + `${key}.`);
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
