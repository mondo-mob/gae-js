import { fromPairs, isPlainObject, isString, toPairs } from "lodash";
import { SecretsClient } from "./secrets.client";
import { createLogger } from "../../logging";

const secretPattern = /\s*SECRET\(\s*([\w-]+)\s*\)\s*/;

const getSecretKey = (src: string): string | undefined => {
  const matches = src.match(secretPattern);
  return matches?.length === 2 ? matches[1] : undefined;
};

export class SecretsResolver {
  private readonly logger = createLogger("secrets-resolver");

  constructor(private readonly secretsClient: SecretsClient) {}

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
    return this.secretsClient.fetchSecret(key);
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
