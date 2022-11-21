import { z, ZodType } from "zod";
import { BadRequestError } from "@mondomob/gae-js-core";

/**
 * Convenience to validate a request payload and coerce to expected type.
 * Will throw BadRequestError for any validation failure.
 * @param schema schema to validate against
 * @param data request payload
 */
export const validateRequest = <T>(schema: ZodType<T, z.ZodTypeDef, unknown>, data: unknown): T => {
  const decoded = schema.safeParse(data);
  if (!decoded.success) {
    throw new BadRequestError(decoded.error.message || "Invalid payload");
  }
  return decoded.data;
};

export const oneOrManyStrings = z.preprocess((arg) => {
  return typeof arg === "string" ? [arg] : arg;
}, z.array(z.string()).optional());
