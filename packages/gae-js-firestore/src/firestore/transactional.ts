import { firestoreLoaderRequestStorage } from "./firestore-request-storage";
import { createLogger, runWithRequestStorage } from "@mondomob/gae-js-core";

const logger = createLogger("Transactional");

type AnyAsync<T = any> = (...args: any[]) => Promise<T>;

const applyInTransaction = (thisArg: any, original: AnyAsync, ...args: any[]): Promise<any> => {
  const loader = getLoader();
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

const getLoader = () =>
  firestoreLoaderRequestStorage.getRequired(
    "Firestore transactions require a FirestoreLoader to be set in request storage but none was found."
  );

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
    const originalMethod = descriptor.value;
    if (originalMethod) {
      descriptor.value = async function (...args) {
        return applyInTransaction(this, originalMethod, ...args);
      };
    }
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

/**
 * Does the current firestore loader have an active transaction?
 * - Must be run with firestoreLoaderRequestStorage enabled
 */
export const isTransactionActive = (): boolean => {
  return getLoader().isTransaction();
};
