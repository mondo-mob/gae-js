import { castArray } from "lodash";

export type OneOrMany<T> = T | ReadonlyArray<T>;

/** @deprecated use lodash castArray instead */
export const asArray = <T>(input: OneOrMany<T>): T[] => castArray(input);

export const isReadonlyArray = <T>(input: OneOrMany<T>): input is ReadonlyArray<T> => Array.isArray(input);
