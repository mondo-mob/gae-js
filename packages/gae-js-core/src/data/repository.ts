import { OneOrMany } from "../util";

export interface BaseEntity {
  id: string;
}

export interface Repository<T extends BaseEntity, Q = any, QR = any> {
  get(ids: string | ReadonlyArray<string>): Promise<OneOrMany<T | null>>;

  save(entities: OneOrMany<T>): Promise<OneOrMany<T>>;

  insert(entities: OneOrMany<T>): Promise<OneOrMany<T>>;

  update(entities: OneOrMany<T>): Promise<OneOrMany<T>>;

  upsert(entities: OneOrMany<T>): Promise<OneOrMany<T>>;

  delete(...ids: string[]): Promise<void>;

  deleteAll(): Promise<void>;

  query(options: Partial<Q>): Promise<QR>;
}
