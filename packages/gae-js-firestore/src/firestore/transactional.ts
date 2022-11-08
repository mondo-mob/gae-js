import { createLogger, RequestStorageStore, runWithRequestStorage } from "@mondomob/gae-js-core";
import { firestoreLoaderRequestStorage } from "./firestore-request-storage";

const logger = createLogger("Transactional");

type AnyAsync<T = any> = (...args: any[]) => Promise<T>;
type ActionFunction = () => Promise<unknown> | unknown;

const postCommitActions = new RequestStorageStore<ActionFunction[]>("_TRANSACTION_POST_COMMIT_ACTIONS");
const getPostCommitActions = () =>
  postCommitActions.getRequired("No transaction exists. Cannot access post-commit actions.");

const applyInTransaction = (thisArg: any, original: AnyAsync, ...args: any[]): Promise<any> => {
  const loader = getLoader();
  if (loader.isTransaction()) {
    logger.info("Continuing existing transaction...");
    return original.apply(thisArg, args);
  } else {
    logger.info("Starting new transactional context...");
    return runWithRequestStorage(async () => {
      const result = await loader.inTransaction((txnLoader) => {
        postCommitActions.set([]);
        firestoreLoaderRequestStorage.set(txnLoader);
        return original.apply(thisArg, args);
      });

      try {
        const actions = getPostCommitActions();
        if (actions.length > 0) {
          logger.info(`Executing ${actions.length} post-commit actions after transaction has been committed`);
          for (const action of actions) {
            await action();
          }
        }
        return result;
      } catch (err) {
        logger.warn("Post-commit error encountered", err);
        throw new PostCommitError(err, result);
      }
    });
  }
};

/**
 * Executes an action after commit if there is a transaction present, otherwise immediately if there is not.
 *
 * @param action the action to execute - a no-args async function.
 */
export const execPostCommitOrNow = async (action: ActionFunction): Promise<void> => {
  if (isTransactionActive()) {
    getPostCommitActions().push(action);
  } else {
    await action();
  }
};

/**
 * Executes an action after commit if there is a transaction present, otherwise immediately if there is not.
 *
 * This version of the function does not use promises
 *
 * @param action the action to execute - a no-args synchronous function.
 */
export const execPostCommitOrNowSync = (action: () => unknown): void => {
  if (isTransactionActive()) {
    getPostCommitActions().push(action);
  } else {
    action();
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
 * Is there firestoreLoaderRequestStorage enabled, and does the current loader have an active transaction?
 */
export const isTransactionActive = (): boolean => {
  return !!firestoreLoaderRequestStorage.get()?.isTransaction();
};

export class PostCommitError<T = unknown> extends Error {
  constructor(readonly cause: unknown, readonly result: T) {
    super();
    this.name = "PostCommitError";
  }
}

const getLoader = () =>
  firestoreLoaderRequestStorage.getRequired(
    "Firestore transactions require a FirestoreLoader to be set in request storage but none was found."
  );
