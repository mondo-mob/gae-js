export type OneOrMany<T> = T | ReadonlyArray<T>;

export const asArray = <T>(input: OneOrMany<T>): T[] => (Array.isArray(input) ? input : [input]);

export const isReadonlyArray = <T>(input: OneOrMany<T>): input is ReadonlyArray<T> => Array.isArray(input);
