import { NESTED_FIELD_DELIMITER } from "./index-mapper";
import { isPredicate, isPredicateArray, Predicate, SearchFields } from "@mondomob/gae-js-core";

export interface ValueFilter {
  [key: string]: any;
}

export interface RangeFilter {
  [key: string]: {
    from?: string | number | Date;
    to?: string | number | Date;
  };
}

export interface AppSearchFilters {
  all: Array<ValueFilter | RangeFilter>;
  none: Array<ValueFilter | RangeFilter>;
}

const toRangeFilter = (fieldName: string, input: Predicate) => {
  if ([">", ">="].includes(input.op)) {
    return {
      [fieldName]: {
        from: input.value,
      },
    };
  }
  if (["<", "<="].includes(input.op)) {
    return {
      [fieldName]: {
        to: input.value,
      },
    };
  }
  throw new Error(`Invalid operation for range filter ${input.op}`);
};

const toValueFilter = (fieldName: string, input: string | string[] | Predicate): ValueFilter => {
  return isPredicate(input)
    ? {
        [fieldName]: input.value,
      }
    : {
        [fieldName]: input,
      };
};

const addFilter = (filters: AppSearchFilters, fieldName: string, input: string | string[] | Predicate) => {
  if (isPredicate(input)) {
    if ("=" === input.op) {
      filters.all.push(toValueFilter(fieldName, input));
    } else if ("!=" === input.op) {
      filters.none.push(toValueFilter(fieldName, input));
    } else if ([">", ">=", "<", "<="].includes(input.op)) {
      filters.all.push(toRangeFilter(fieldName, input));
    } else {
      throw new Error(`Unsupported filter operation ${input.op}`);
    }
  } else {
    filters.all.push(toValueFilter(fieldName, input));
  }
};

export const prepareFilters = (fields: SearchFields): AppSearchFilters => {
  return Object.keys(fields).reduce(
    (result: AppSearchFilters, key) => {
      const field = fields[key];
      const normalisedFieldName = normaliseFieldName(key);
      if (isPredicateArray(field)) {
        field.forEach((predicate) => addFilter(result, normalisedFieldName, predicate));
      } else {
        addFilter(result, normalisedFieldName, field);
      }
      return result;
    },
    { all: [], none: [] }
  );
};

export const normaliseFieldName = (fieldName: string): string =>
  fieldName.replace(/\./g, NESTED_FIELD_DELIMITER).toLowerCase();
