import * as t from "io-ts";
import reporter from "io-ts-reporters";
import { isLeft } from "fp-ts/Either";
import { ConfigValidator } from "./configuration";

export const iotsValidator =
  <T>(schema: t.Type<T>): ConfigValidator<T> =>
  (data: unknown) => {
    const decoded = schema.decode(data);
    if (isLeft(decoded)) {
      throw Error(`Configuration does not conform to expected format: ${reporter.report(decoded)}`);
    }
    return decoded.right;
  };
