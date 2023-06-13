import { fromPairs, isPlainObject, isString, toPairs } from "lodash";
import { createLogger } from "../../../logging";
import { SecretsClient } from "./secrets.client";

const secretPattern = /\s*SECRET\(\s*([\w-]+)\s*\)\s*/;

const getSecretKey = (src: string): string | undefined => {
  const matches = src.match(secretPattern);
  return matches?.length === 2 ? matches[1] : undefined;
};

export interface SecretsResolverOptions {
  projectId?: string;
  secretsClient?: SecretsClient;
}

export class SecretsResolver {
  private readonly logger = createLogger("secrets-resolver");

  private secretsClient: SecretsClient | null;

  constructor(private readonly options: SecretsResolverOptions) {
    this.secretsClient = options.secretsClient || null;
  }

  async resolveSecrets<T extends Record<string, any>>(obj: T): Promise<T> {
    const pairs = toPairs(obj);

    const promisesAndValues = pairs.map(([key, value]) => {
      if (isPlainObject(value)) {
        return this.resolvePairWithObject([key, value]);
      }
      return isString(value) ? this.resolveSecretForPairIfRequired([key, value]) : [key, value];
    });

    const resolvedPairs = await Promise.all(promisesAndValues);

    return fromPairs(resolvedPairs) as T;
  }

  async resolveSecretIfRequired(src: string): Promise<string> {
    const key = getSecretKey(src);
    if (!key) {
      return src;
    }
    this.logger.info(`Resolving secret for key: ${key}`);
    return this.getSecretsClient().fetchSecret(key);
  }

  /**
   * Internal lazy initialisation of secrets client.
   * We only want to create the client if there are secrets to resolve.
   * @private
   */
  private getSecretsClient() {
    if (this.secretsClient) {
      return this.secretsClient;
    }
    if (!this.options.projectId) {
      throw new Error('No project set for resolving secrets - please configure "secretsProjectId" or "projectId"');
    }
    this.logger.info(`Creating secrets client for projectId: ${this.options.projectId}`);
    this.secretsClient = new SecretsClient(this.options.projectId);
    return this.secretsClient;
  }

  private async resolvePairWithObject([key, value]: [string, Record<string, any>]): Promise<
    [string, Record<string, any>]
  > {
    const resolvedObject = await this.resolveSecrets(value);
    return [key, resolvedObject];
  }

  private async resolveSecretForPairIfRequired([key, value]: [string, string]): Promise<[string, string]> {
    const resolved = await this.resolveSecretIfRequired(value);
    return [key, resolved];
  }
}
