import pLimit from "p-limit";

export const gcsPromiseLimit = pLimit(20);
