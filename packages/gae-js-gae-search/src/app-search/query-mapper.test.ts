import { prepareFilters } from "./query-mapper";

describe("QueryMapper", () => {
  describe("prepareFilters", () => {
    describe("single values", () => {
      it("maps string value to value filter", () => {
        const filters = prepareFilters({ field1: "string value", "nested1.nested2.field2": "nested" });

        expect(filters.all.length).toBe(2);
        expect(filters.none.length).toBe(0);
        expect(filters.all[0].field1).toEqual("string value");
        expect(filters.all[1].nested1__nested2__field2).toEqual("nested");
      });
    });

    describe("array values", () => {
      it("maps string array value to value filter", () => {
        const filters = prepareFilters({ field1: ["string value1", "string value2"] });

        expect(filters.all.length).toBe(1);
        expect(filters.none.length).toBe(0);
        expect(filters.all[0].field1).toEqual(["string value1", "string value2"]);
      });
    });

    describe("single predicate", () => {
      it('maps > and >= predicates to "from" range filters', () => {
        const filters = prepareFilters({ field1: { op: ">", value: 12345 }, field2: { op: ">=", value: 23456 } });

        expect(filters.all.length).toBe(2);
        expect(filters.none.length).toBe(0);
        expect(filters.all[0].field1).toEqual({
          from: 12345,
        });
        expect(filters.all[1].field2).toEqual({
          from: 23456,
        });
      });

      it('maps < and <= predicates to "to" range filters', () => {
        const filters = prepareFilters({ field1: { op: "<", value: 12345 }, field2: { op: "<=", value: 23456 } });

        expect(filters.all.length).toBe(2);
        expect(filters.none.length).toBe(0);
        expect(filters.all[0].field1).toEqual({
          to: 12345,
        });
        expect(filters.all[1].field2).toEqual({
          to: 23456,
        });
      });

      it("maps != predicate to none filter", () => {
        const filters = prepareFilters({ field1: { op: "!=", value: "Not me" } });

        expect(filters.all.length).toBe(0);
        expect(filters.none.length).toBe(1);
        expect(filters.none[0].field1).toEqual("Not me");
      });
    });

    describe("predicate array", () => {
      it("maps predicate array to multiple filters", () => {
        const filters = prepareFilters({
          field1: [
            { op: ">", value: 12345 },
            { op: "<", value: 45678 },
          ],
        });

        expect(filters.all.length).toBe(2);
        expect(filters.none.length).toBe(0);
        expect(filters.all[0].field1).toEqual({
          from: 12345,
        });
        expect(filters.all[1].field1).toEqual({
          to: 45678,
        });
      });
    });
  });
});
