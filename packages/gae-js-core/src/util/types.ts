export type OneOrMany<T> = T | ReadonlyArray<T>;

export const asArray = <T>(input: OneOrMany<T>): T[] => (Array.isArray(input) ? input : [input]);
