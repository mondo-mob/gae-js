import { ZodType } from "zod/lib/types";
import { DataValidator } from "./data";

export const zodValidator =
  <T>(schema: ZodType<T>): DataValidator<T> =>
  (data: unknown) => {
    return schema.parse(data);
  };
