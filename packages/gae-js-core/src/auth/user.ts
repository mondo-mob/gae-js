export interface BaseUser {
  id: string;
  email?: string;
  displayName?: string;
  roles: ReadonlyArray<string>;
}
