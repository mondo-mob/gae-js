export class RepositoryError extends Error {
  constructor(operation: "load" | "save", kind: string, id: string, errors: string[]) {
    super(`"${kind}" with id "${id}" failed to ${operation} due to ${errors.length} errors:\n${errors.join("\n")}`);
    this.name = "RepositoryError";
  }
}

export class RepositoryNotFoundError extends RepositoryError {
  constructor(kind: string, id: string) {
    super("load", kind, id, ["invalid id"]);
    this.name = "RepositoryNotFoundError";
  }
}
