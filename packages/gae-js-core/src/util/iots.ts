import * as iots from "io-ts";
import iotsReporter from "io-ts-reporters";
import { isLeft } from "fp-ts/lib/Either";
import { DataValidator } from "./data";

export const iotsValidator =
  <T>(schema: iots.Type<T>): DataValidator<T> =>
  (data: unknown) => {
    const decoded = schema.decode(data);
    if (isLeft(decoded)) {
      throw Error(iotsReporter.report(decoded).join(", "));
    }
    return decoded.right;
  };

export { iots, iotsReporter, isLeft };
