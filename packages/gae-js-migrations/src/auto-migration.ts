import { Logger } from "@mondomob/gae-js-core";

export interface MigrateParams {
  logger: Logger;
}

export interface MigrationConfig {
  environment: string;
}

export interface AutoMigration {
  id: string;
  migrate: (params: MigrateParams) => Promise<void>;
  skip?: (conf: MigrationConfig) => boolean;
}
