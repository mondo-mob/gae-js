import { Timestamp } from "@google-cloud/firestore";
import { cloneDeepWith } from "lodash";

export const timestampToDateTransformer = <T>(): ValueTransformer<T> => ({
  test: ({ src }) => src instanceof Timestamp,
  transform: ({ src }) => src.toDate(),
});

/**
 * @property {any} src  The original source value.
 * @property {number | string} key If the current value is the value of an object then this represents the object key.
 * @property {TObject} object The original top-level object. Allows other fields to be referenced.
 * @template TObject
 */
export interface ValueTransformerParams<TObject> {
  src: any;
  key?: number | string;
  object: TObject;
}

/**
 * Convert a field value if it passes the {@link test} function.
 */
export interface ValueTransformer<TObject> {
  /**
   * Test the field to see if it is a candidate for this transformer.
   * @param params {@link ValueTransformerParams} parameters.
   *
   * @return true if {@link transform} should be called.
   */
  test: (params: ValueTransformerParams<TObject>) => boolean;

  /**
   * Transform the field value to any other value.
   * @param params {@link ValueTransformerParams} parameters.
   *
   * @return the transformed value
   */
  transform: (params: ValueTransformerParams<TObject>) => any;
}

export const transformDeep = <T>(src: T, transformers: ValueTransformer<T>[]) =>
  transformers.length === 0
    ? src
    : cloneDeepWith(src, (value, key) => transformWith(transformers, { src: value, key, object: src }));

const transformWith = <T>(transformers: ValueTransformer<T>[], params: ValueTransformerParams<T>) => {
  const transformer = transformers.find((transformer) => transformer.test(params));
  return transformer?.transform(params);
};
