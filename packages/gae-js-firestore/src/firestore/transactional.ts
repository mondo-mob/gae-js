import { firestoreLoaderRequestStorage } from "./firestore-request-storage";
import { createLogger, runWithRequestStorage } from "@dotrun/gae-js-core";

const logger = createLogger("Transactional");

type AnyAsync<T = any> = (...args: any[]) => Promise<T>;

const applyInTransaction = (thisArg: any, original: AnyAsync, ...args: any[]): Promise<any> => {
  const loader = firestoreLoaderRequestStorage.getRequired();
  if (loader.isTransaction()) {
    logger.info("Continuing existing transaction...");
    return original.apply(thisArg, args);
  } else {
    logger.info("Starting new transactional context...");
    return runWithRequestStorage(() =>
      loader.inTransaction((txnLoader) => {
        firestoreLoaderRequestStorage.set(txnLoader);
        return original.apply(thisArg, args);
      })
    );
  }
};

/**
 * Method decorator to run a function within a transaction.
 * - Must be run with firestoreLoaderRequestStorage enabled
 * - If not already in a transactional context a new one will be created
 * - If an existing transaction is found then this will be reused
 */
export function Transactional() {
  return function (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<AnyAsync>
  ): TypedPropertyDescriptor<AnyAsync> {
    const value = descriptor.value;
    if (!value) throw new Error("No descriptor value for Transactional annotation");

    descriptor.value = async function (...args) {
      return applyInTransaction(this, value, ...args);
    };

    return descriptor;
  };
}

/**
 * Runs the provided function within a transaction.
 * - Must be run with firestoreLoaderRequestStorage enabled
 * - If not already in a transactional context a new one will be created
 * - If an existing transaction is found then this will be reused
 */
export const runInTransaction = <T>(fn: AnyAsync<T>): Promise<T> => {
  return applyInTransaction(this, fn);
};
