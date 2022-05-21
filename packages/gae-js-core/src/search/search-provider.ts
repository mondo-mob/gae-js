import { SearchService } from "./search.service";
import { Provider } from "../util";

export const searchProvider = new Provider<SearchService>(
  undefined,
  "No SearchService instance found. Please initialise searchProvider."
);
