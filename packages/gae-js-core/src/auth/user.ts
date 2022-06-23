export interface BaseUser {
  id: string;
  email?: string | null;
  displayName?: string | null;
  roles?: ReadonlyArray<string> | null;
}
