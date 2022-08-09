import { Timestamp } from "@google-cloud/firestore";
import { DateTransformers, transformDeep, ValueTransformer } from "./value-transformers";

describe("value-transformers", () => {
  describe("transformDeep", () => {
    it("transforms using the first matching transformer per property", () => {
      const src = {
        foo: "bar",
        num: 1,
        obj: {
          foo: "bar",
        },
      };
      type SrcType = typeof src;
      const strTransformer1: ValueTransformer<SrcType> = {
        test: ({ src }) => typeof src === "string",
        transform: ({ src }) => `${src}1`,
      };
      const strTransformer2: ValueTransformer<SrcType> = {
        test: ({ src }) => typeof src === "string",
        transform: ({ src }) => `${src}2`,
      };
      const numTransformer: ValueTransformer<SrcType> = {
        test: ({ src }) => typeof src === "number",
        transform: ({ src }) => ({
          withNumProp: (src as number) + 1,
        }),
      };

      const result = transformDeep(src, [strTransformer1, strTransformer2, numTransformer]);

      expect(result).toEqual({
        foo: "bar1",
        num: {
          withNumProp: 2,
        },
        obj: {
          foo: "bar1",
        },
      });
    });

    it("transforms deep nested property with access to source object", () => {
      const src = {
        foo: "bar",
        num: 1,
        arr: [
          {
            nestedFoo: "bar",
          },
        ],
      };
      type SrcType = typeof src;
      const compareTransformer: ValueTransformer<SrcType> = {
        test: ({ src }) => typeof src === "object" && "nestedFoo" in src,
        transform: ({ src, object }) => (src.nestedFoo === object.foo ? "Same as foo!" : "Different"),
      };

      const result = transformDeep(src, [compareTransformer]);

      expect(result).toEqual({
        foo: "bar",
        num: 1,
        arr: ["Same as foo!"],
      });
    });
  });

  describe("DateTransformers", () => {
    describe("read", () => {
      it("converts timestamp to date", () => {
        const src = {
          date: Timestamp.fromDate(new Date()),
        };
        expect(transformDeep(src, [DateTransformers.read()])).toEqual({
          date: src.date.toDate(),
        });
      });
    });

    describe("write", () => {
      it("converts date to timestamp", () => {
        const src = {
          date: new Date(),
        };
        expect(transformDeep(src, [DateTransformers.write()])).toEqual({
          date: Timestamp.fromDate(src.date),
        });
      });
    });
  });
});
