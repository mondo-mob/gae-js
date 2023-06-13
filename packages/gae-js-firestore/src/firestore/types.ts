import { ValueTransformer } from "./value-transformers";

// Keep this generic so we don't hardcode "string" everywhere, in case this ever changes
export type IdType = string;

export interface BaseEntity {
  id: IdType;
}

export interface DocumentIdentifier {
  id: IdType;
  parentPath: string;
}

export interface GroupEntity<T> {
  id: DocumentIdentifier;
  entity: T;
}

export interface ValueTransformers<T> {
  read: ValueTransformer<T>[];
  write: ValueTransformer<T>[];
}
