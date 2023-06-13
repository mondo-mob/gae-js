import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { validateNotNil } from "../../../util/validators";

export class SecretsClient {
  private readonly client: SecretManagerServiceClient;
  private readonly secretsBasePath: string;

  constructor(gcpProjectId: string) {
    this.client = new SecretManagerServiceClient();
    this.secretsBasePath = `projects/${gcpProjectId}/secrets`;
  }

  async fetchSecret(name: string, version = "latest"): Promise<string> {
    const secret = await this.fetchOptionalSecret(name, version);
    return validateNotNil(secret, `Cannot find secret: ${name}`);
  }

  async fetchOptionalSecret(name: string, version = "latest"): Promise<string | undefined> {
    const [secret] = await this.client.accessSecretVersion({
      name: `${this.secretsBasePath}/${name}/versions/${version}`,
    });
    return secret.payload?.data?.toString();
  }
}
