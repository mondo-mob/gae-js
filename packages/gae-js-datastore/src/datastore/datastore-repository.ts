import { Datastore } from "@google-cloud/datastore";
import { entity as Entity } from "@google-cloud/datastore/build/src/entity";
import { RunQueryInfo } from "@google-cloud/datastore/build/src/query";
import * as _ from "lodash";
import {
  asArray,
  iots as t,
  iotsReporter as reporter,
  isLeft,
  BaseEntity,
  OneOrMany,
  Repository,
} from "@dotrun/gae-js-core";
import { DatastoreLoader, Index, QueryOptions, DatastorePayload } from "./datastore-loader";
import { datastoreLoaderRequestStorage } from "./datastore-request-storage";
import { datastoreProvider } from "./datastore-provider";

export interface RepositoryOptions<T extends { id: any }> {
  datastore?: Datastore;
  // TODO: Make optional?
  validator: t.Type<T>;
  defaultValues?: Partial<Omit<T, "id">>;
  index?: Index<Omit<T, "id">>;
}

export function buildExclusions<T>(input: T, schema: Index<T> = {}, path = ""): string[] {
  if (schema === true) {
    return [];
  } else if (Array.isArray(input)) {
    return _.chain(input)
      .flatMap((value) => {
        return buildExclusions(value, schema, `${path}[]`);
      })
      .push(`${path}[]`)
      .uniq()
      .value();
  } else if (typeof input === "object") {
    const paths = _.flatMap<Record<string, unknown>, string>(input as any, (value, key) => {
      return buildExclusions(value, (schema as any)[key], `${path}${path.length > 0 ? "." : ""}${key}`);
    });

    if (path) {
      paths.push(path);
    }

    return paths;
  }

  return [path];
}

export const datastoreKey = new t.Type<Entity.Key>(
  "Entity.Key",
  (input): input is Entity.Key => typeof input === "object",
  (input) => t.success(input as Entity.Key),
  (value: Entity.Key) => value
);

export const dateType = new t.Type<Date>(
  "DateType",
  (m): m is Date => m instanceof Date,
  (m, c) => (m instanceof Date ? t.success(m) : t.failure("Value is not date", c)),
  (a) => a
);

class LoadError extends Error {
  constructor(kind: string, id: string, errors: string[]) {
    super(`"${kind}" with id "${id}" failed to load due to ${errors.length} errors:\n${errors.join("\n")}`);
  }
}

class SaveError extends Error {
  constructor(kind: string, id: string, errors: string[]) {
    super(`"${kind}" with id "${id}" failed to save due to ${errors.length} errors:\n${errors.join("\n")}`);
  }
}

export class DatastoreRepository<T extends BaseEntity> implements Repository<T> {
  private readonly validator: t.Type<T>;
  private readonly datastore?: Datastore;

  constructor(protected readonly kind: string, protected readonly options: RepositoryOptions<T>) {
    this.datastore = options?.datastore;
    this.validator = options.validator;
  }

  async getRequired(id: string): Promise<T> {
    const result = await this.get(id);
    if (!result) {
      throw new LoadError(this.kind, id, ["invalid id"]);
    }
    return result;
  }

  async get(id: string): Promise<T | null>;
  async get(id: ReadonlyArray<string>): Promise<ReadonlyArray<T>>;
  async get(ids: string | ReadonlyArray<string>): Promise<OneOrMany<T | null>> {
    const idArray = asArray(ids);
    const allKeys = idArray.map(this.key);

    const results = await this.getLoader().get(allKeys);

    const validatedResults = results.map((result, idx) => {
      if (result) {
        return this.validate(idArray[idx], result);
      }

      return result;
    });

    if (Array.isArray(ids)) {
      return validatedResults;
    } else {
      return validatedResults[0];
    }
  }

  async query(options: Partial<QueryOptions<T>> = {}): Promise<[ReadonlyArray<T>, RunQueryInfo]> {
    const [results, queryInfo] = await this.getLoader().executeQuery<T>(this.kind, options);

    return [
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      results.map<any>((value) => this.validate(value[Entity.KEY_SYMBOL].name!, _.omit(value, Datastore.KEY))),
      queryInfo,
    ];
  }

  async save(entities: T): Promise<T>;
  async save(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async save(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersist(entities), (loader, e) => loader.save(e));
  }

  async update(entities: T): Promise<T>;
  async update(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async update(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersist(entities), (loader, e) => loader.update(e));
  }

  async insert(entities: T): Promise<T>;
  async insert(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async insert(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersist(entities), (loader, e) => loader.insert(e));
  }

  async upsert(entities: T): Promise<T>;
  async upsert(entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async upsert(entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(this.beforePersist(entities), (loader, e) => loader.upsert(e));
  }

  /**
   * Common hook to allow sub-classes to do any transformations necessary before insert/update/save/upsert.
   *
   * By default this just returns the same entities and does not change input.
   *
   * @param entities Entities that will be persisted, optionally with any transformations.
   */
  protected beforePersist(entities: OneOrMany<T>): OneOrMany<T> {
    return entities;
  }

  /**
   * Reindex all entities in datastore
   *
   * Loads all entities into memory and applies some mutation to them before resaving them
   *
   * @param operation (Optional) The operation to perform on each entity, returning the new
   * form. By default this will return the same instance.
   */
  async reindex(operation: (input: T) => T | Promise<T> = (input) => input): Promise<ReadonlyArray<T>> {
    const [allEntities] = await this.query();

    const updatedEntities = await Promise.all(allEntities.map(operation));

    return this.update(updatedEntities);
  }

  async delete(...ids: string[]): Promise<void> {
    const allIds = ids.map((id) => this.key(id));
    await this.getLoader().delete(allIds);
  }

  async deleteAll(): Promise<void> {
    const [allEntities] = await this.query();
    const allIds = allEntities.map((value) => this.key(value.id));
    await this.getLoader().delete(allIds);
  }

  public key = (name: string): Entity.Key => {
    return this.getDatastore().key([this.kind, name]);
  };

  private validate = (id: string, value: Record<string, unknown>): T => {
    const entity = { ...(this.options.defaultValues as any), ...value, id };

    const validation = this.validator.decode(entity);

    if (isLeft(validation)) {
      const errors = reporter.report(validation);
      throw new LoadError(this.kind, id, errors);
    }

    return validation.right;
  };

  private async applyMutation(
    entities: OneOrMany<T>,
    mutation: (loader: DatastoreLoader, entities: ReadonlyArray<DatastorePayload>) => Promise<any>
  ): Promise<OneOrMany<T>> {
    const entitiesToSave = asArray(entities)
      .map((entity) => {
        const validation = this.validator.decode(entity);

        if (isLeft(validation)) {
          const errors = reporter.report(validation);
          throw new SaveError(this.kind, entity.id, errors);
        }

        return validation.right;
      })
      .map((data) => {
        const withoutId = _.omit(data, "id");
        return {
          key: this.key(data.id),
          data: withoutId,
          excludeFromIndexes: buildExclusions(withoutId, this.options.index),
        } as DatastorePayload;
      });

    await mutation(this.getLoader(), entitiesToSave);

    return entities;
  }

  private getDatastore = (): Datastore => {
    return this.datastore ?? datastoreProvider.get();
  };

  private getLoader = (): DatastoreLoader => {
    const loader = datastoreLoaderRequestStorage.get();
    return loader ?? new DatastoreLoader(this.getDatastore());
  };
}
