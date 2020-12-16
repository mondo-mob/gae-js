class RepositoryError extends Error {
  constructor(operation: "load" | "save", kind: string, id: string, errors: string[]) {
    super(`"${kind}" with id "${id}" failed to ${operation} due to ${errors.length} errors:\n${errors.join("\n")}`);
  }
}
