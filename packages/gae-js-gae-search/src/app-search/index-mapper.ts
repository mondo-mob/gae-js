import * as _ from "lodash";
import { IndexEntry } from "@mondomob/gae-js-core";

export const NESTED_FIELD_DELIMITER = "__";

interface IndexableField {
  name: string;
  value: string | number;
}

interface IndexableDocument {
  [key: string]: string | number | Array<string | number>;
}

const flattenObject = (field: any, prefix = ""): IndexableField[] => {
  const fields: IndexableField[] = [];
  if (_.isArray(field)) {
    field.forEach((value) => fields.push(...flattenObject(value, prefix)));
  } else if (_.isDate(field)) {
    fields.push({ name: prefix, value: field.toISOString() });
  } else if (_.isBoolean(field)) {
    fields.push({ name: prefix, value: field.toString() });
  } else if (_.isString(field) || _.isNumber(field)) {
    fields.push({ name: prefix, value: field });
  } else if (_.isObjectLike(field)) {
    Object.keys(field).forEach((key) => {
      const name = prefix ? `${prefix}${NESTED_FIELD_DELIMITER}${key}`.toLowerCase() : key.toLowerCase();
      fields.push(...flattenObject(field[key], name));
    });
  } else {
    fields.push({ name: prefix, value: field });
  }

  return fields;
};

const aggregateRepeatingFields = (flattenedFields: IndexableField[]): IndexableDocument => {
  return flattenedFields.reduce((acc, field) => {
    const { name, value } = field;
    const currentValue = acc[name];
    if (!currentValue) {
      acc[name] = value;
    } else {
      if (Array.isArray(currentValue)) {
        currentValue.push(value);
      } else {
        acc[name] = [currentValue, value];
      }
    }
    return acc;
  }, {} as IndexableDocument);
};

export const prepareDocument = (indexEntry: IndexEntry): IndexableDocument => {
  const flattenedFields = flattenObject(indexEntry.fields);
  return {
    id: indexEntry.id,
    ...aggregateRepeatingFields(flattenedFields),
  };
};
