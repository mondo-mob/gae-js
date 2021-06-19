import { asArray, OneOrMany } from "../util";
import { BaseEntity, Repository } from "./repository";

export class MockRepository<T extends BaseEntity> implements Repository<T> {
  public store: Record<string, T> = {};

  async get(ids: string | ReadonlyArray<string>): Promise<OneOrMany<T | null>> {
    return asArray(ids).reduce((entities, id) => {
      if (this.store[id]) entities.push(this.store[id]);
      return entities;
    }, [] as T[]);
  }

  async save(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    asArray(entities).forEach((entity) => (this.store[entity.id] = entity));
    return entities;
  }

  async insert(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.save(entities);
  }

  async update(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.save(entities);
  }

  async upsert(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.save(entities);
  }

  async delete(...ids: string[]): Promise<void> {
    ids.forEach((id) => delete this.store[id]);
  }

  async deleteAll(): Promise<void> {
    this.store = {};
  }
}
