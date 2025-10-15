import type { BetterAuthPlugin } from "better-auth/types";
import { siwfClient } from "./client.js";
import { schema } from "./schema.js";
import type { SIWFPluginOptions } from "./types.js";
declare const siwf: (options: SIWFPluginOptions) => BetterAuthPlugin;
export type { FarcasterUser, ResolveFarcasterUserArgs, ResolveFarcasterUserResult, SIWFClientType, SIWFPluginOptions, SIWFVerifyArgs, SIWFVerifyResponse, } from "./types.js";
export { siwf, siwfClient, schema };
//# sourceMappingURL=index.d.ts.map