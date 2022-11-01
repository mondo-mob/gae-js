import { LazyProvider } from "@mondomob/gae-js-core";
import { OAuth2Client } from "google-auth-library";

export const googleAuthClientProvider = new LazyProvider(() => new OAuth2Client());
