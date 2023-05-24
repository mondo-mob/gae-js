export class FirestoreRepositoryError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "FirestoreRepositoryError";
  }
}

export class RepositoryError extends FirestoreRepositoryError {
  constructor(
    operation: "load" | "save",
    kind: string,
    id: string,
    errors: string[],
    code = `${operation}.repository.error`
  ) {
    super(
      code,
      `"${kind}" with id "${id}" failed to ${operation} due to ${errors.length} errors:\n${errors.join("\n")}`
    );
    this.name = "RepositoryError";
  }
}

export class RepositoryNotFoundError extends RepositoryError {
  constructor(kind: string, id: string) {
    super("load", kind, id, ["invalid id"], "notfound.repository.error");
    this.name = "RepositoryNotFoundError";
  }
}
