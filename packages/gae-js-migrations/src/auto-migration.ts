import { Logger } from "@mondomob/gae-js-core";

export interface MigrateParams {
  logger: Logger;
}

export interface AutoMigration {
  id: string;
  migrate: (params: MigrateParams) => Promise<void>;
  skip?: () => boolean;
}
