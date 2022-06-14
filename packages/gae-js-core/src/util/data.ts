/**
 * Simple data validator that takes some unknown data and returns a typed object.
 * If the data doesn't match the expected format it should throw an Error
 */
export type DataValidator<T> = (data: unknown) => T;
