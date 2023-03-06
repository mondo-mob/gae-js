import { Logger } from "@mondomob/gae-js-core";
import { MigrationOptions } from "./migration";

export interface MigrateParams {
  /**
   * Logger instance created with migration id prefix
   */
  logger: Logger;
}

export interface AutoMigration {
  /**
   * Unique identifier for this migration. Used to determine if migration has been run already.
   */
  id: string;
  /**
   * Migration operation to perform - the main code for your operation. Use the supplied
   * logger, via params, to log with contextual prefix.
   * @param params
   */
  migrate: (params: MigrateParams) => Promise<void>;
  /**
   * Optional function to determine if this migration should be skipped (by default it will not skip). This is
   * handy to skip in certain environments.
   */
  skip?: () => boolean;
  /**
   * Override of default options, or those set globally for migrations.
   */
  options?: MigrationOptions;
}
