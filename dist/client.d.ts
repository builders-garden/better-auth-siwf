import type { BetterFetchResponse } from "@better-fetch/fetch";
import type { siwf } from "./index.js";
import type { SIWFLinkResponse, SIWFSignInAuthData, SIWFSignInResponse, SIWFUnlinkResponse } from "./types.js";
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
         * @returns BetterFetchResponse<SIWFSignInResponse>
         * @throws APIError if the sign in fails
         */
        signInWithFarcaster: (authData: SIWFSignInAuthData) => Promise<BetterFetchResponse<SIWFSignInResponse>>;
        /**
         * Link current user account with Farcaster
         * @param authData - Authenticated data from the Farcaster MiniApp SDK
         * @returns BetterFetchResponse<SIWFLinkResponse>
         * @throws APIError if the link fails
         */
        linkFarcaster: (authData: SIWFSignInAuthData) => Promise<BetterFetchResponse<SIWFLinkResponse>>;
        /**
         * Unlink current user account from Farcaster
         * @returns BetterFetchResponse<SIWFUnlinkResponse>
         * @throws APIError if the unlink fails
         */
        unlinkFarcaster: () => Promise<BetterFetchResponse<SIWFUnlinkResponse>>;
    };
};
export default siwfClient;
//# sourceMappingURL=client.d.ts.map