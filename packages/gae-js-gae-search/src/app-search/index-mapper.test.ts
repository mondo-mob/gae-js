import { prepareDocument } from "./index-mapper";

describe("IndexMapper", () => {
  describe("prepareDocument", () => {
    it("maps strings as strings", () => {
      const fields = prepareDocument({
        id: "entry1",
        fields: {
          string1: "I am a string",
          string2: "Another string",
          stringArray: ["me1", "me2"],
          nested1: {
            nested2: {
              string3: "I'm nested",
            },
          },
        },
      });

      expectField(fields, "string1", "I am a string");
      expectField(fields, "string2", "Another string");
      expectField(fields, "stringarray", ["me1", "me2"]);
      expectField(fields, "nested1__nested2__string3", "I'm nested");
    });

    it("maps Dates as ISO strings", () => {
      const fields = prepareDocument({
        id: "entry1",
        fields: {
          date1: new Date("2019-04-01T07:05:48.264Z"),
          date2: new Date("2020-08-02T07:05:48.264Z"),
          dateArray: [new Date("2019-04-01T07:05:48.264Z"), new Date("2020-08-02T07:05:48.264Z")],
          nested1: {
            nested2: {
              date3: new Date("2018-12-03T07:05:48.264Z"),
            },
          },
        },
      });

      expectField(fields, "date1", "2019-04-01T07:05:48.264Z");
      expectField(fields, "date2", "2020-08-02T07:05:48.264Z");
      expectField(fields, "datearray", ["2019-04-01T07:05:48.264Z", "2020-08-02T07:05:48.264Z"]);
      expectField(fields, "nested1__nested2__date3", "2018-12-03T07:05:48.264Z");
    });

    it("maps booleans as strings", () => {
      const fields = prepareDocument({
        id: "entry1",
        fields: {
          bool1: true,
          bool2: false,
          boolArray: [true, false],
          nested1: {
            nested2: {
              bool3: Boolean(true),
            },
          },
        },
      });

      expectField(fields, "bool1", "true");
      expectField(fields, "bool2", "false");
      expectField(fields, "boolarray", ["true", "false"]);
      expectField(fields, "nested1__nested2__bool3", "true");
    });

    it("maps numbers as numbers", () => {
      const fields = prepareDocument({
        id: "entry1",
        fields: {
          num1: 123.34,
          num2: 456.78,
          numArray: [123.34, 456.78],
          nested1: {
            nested2: {
              num3: Number(987),
            },
          },
        },
      });

      expectField(fields, "num1", 123.34);
      expectField(fields, "num2", 456.78);
      expectField(fields, "numarray", [123.34, 456.78]);
      expectField(fields, "nested1__nested2__num3", 987);
    });

    const expectField = (fields: any, expectedName: string, expectedValue: any) => {
      expect(fields[expectedName]).toEqual(expectedValue);
    };
  });
});
