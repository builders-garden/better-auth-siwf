import type { siwf } from "./index.js";
import type { SIWFSignInAuthData } from "./types.js";
type SIWFPlugin = typeof siwf;
/**
 * Client plugin for Sign In With Farcaster
 */
export declare const siwfClient: () => {
    id: "siwf";
    $InferServerPlugin: ReturnType<SIWFPlugin>;
    getActions: ($fetch: import("@better-fetch/fetch").BetterFetch) => {
        /**
         * Sign in with Farcaster
         * @param authData - Authenticated data from the Farcaster MiniApp SDK
         * @returns
         */
        signInWithFarcaster: (authData: SIWFSignInAuthData) => Promise<{
            data: unknown;
            error: null;
        } | {
            data: null;
            error: {
                message?: string | undefined;
                status: number;
                statusText: string;
            };
        }>;
        /**
         * Link current user account with Farcaster
         * @param authData - Authenticated data from the Farcaster MiniApp SDK
         * @returns
         */
        linkFarcaster: (authData: SIWFSignInAuthData) => Promise<{
            data: unknown;
            error: null;
        } | {
            data: null;
            error: {
                message?: string | undefined;
                status: number;
                statusText: string;
            };
        }>;
        /**
         * Unlink current user account from Farcaster
         * @returns
         */
        unlinkFarcaster: () => Promise<{
            data: unknown;
            error: null;
        } | {
            data: null;
            error: {
                message?: string | undefined;
                status: number;
                statusText: string;
            };
        }>;
    };
};
export default siwfClient;
//# sourceMappingURL=client.d.ts.map