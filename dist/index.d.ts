import type { BetterAuthPlugin } from "better-auth/types";
import type { SIWFPluginOptions } from "./types.js";
export type { FarcasterUser, SIWFPluginOptions, SIWFSignInAuthData, SIWFSignInResponse, } from "./types.js";
/**
 * Farcaster SIWF authentication plugin for Better Auth.
 *
 * @example
 * ```ts
 * import { siwf } from "better-auth-siwf";
 *
 * const auth = betterAuth({
 *   plugins: [siwf({ hostname: "example.com" })],
 * });
 * ```
 */
export declare const siwf: (options: SIWFPluginOptions) => BetterAuthPlugin;
//# sourceMappingURL=index.d.ts.map