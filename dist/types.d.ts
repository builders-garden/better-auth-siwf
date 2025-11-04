import type { Account, InferOptionSchema, User } from "better-auth/types";
import type { schema } from "./schema.js";
/**
 *  SIWF PLUGIN OPTIONS
 */
export type SIWFPluginOptions = {
    /**
     * The hostname of the server that will be used to verify the Farcaster JWT
     */
    hostname: string;
    /**
     * Whether the user is allowed to link their Farcaster account to their Better Auth account
     * @default true
     */
    allowUserToLink?: boolean;
    /**
     * The schema to use for the SIWF plugin
     * @see schema
     */
    schema?: InferOptionSchema<typeof schema> | undefined;
};
/**
 * SIWF Client Type, returned by the SIWF client plugin
 */
export type SIWFClientType = {
    siwf: {
        signInWithFarcaster: (authData: SIWFSignInAuthData) => Promise<SIWFSignInResponse>;
        linkFarcaster: (authData: SIWFSignInAuthData) => Promise<SIWFSignInResponse>;
        unlinkFarcaster: () => Promise<SIWFSignInResponse>;
    };
};
/**
 * SIWF Sign In Auth Data returned by the Farcaster MiniApp SDK and @farcaster/quick-auth
 */
export type SIWFSignInAuthData = {
    token: string;
    user: {
        fid: number;
        username?: string;
        displayName?: string;
        pfpUrl?: string;
        notificationDetails?: {
            appFid: number;
            url: string;
            token: string;
        }[];
    };
};
/**
 * SIWF Sign In Response, returned by the SIWF sign in endpoint
 * @throws APIError if the sign in fails
 */
export type SIWFSignInResponse = {
    data: {
        success: boolean;
        token: string;
        user: User;
    };
};
/**
 * SIWF Extended Fields used in User and Account models
 */
export type SIWFExtraFields = {
    farcasterFid?: number;
    farcasterUsername?: string;
    farcasterDisplayName?: string;
};
/**
 * SIWF User
 */
export type SIWFUser = User & SIWFExtraFields;
/**
 * SIWF Account
 */
export type SIWFAccount = Account & SIWFExtraFields;
/**
 * SIWF Farcaster User
 */
export type FarcasterUser = {
    id: string;
    userId: string;
    fid: number;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    notificationDetails?: {
        appFid: number;
        url: string;
        token: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
};
//# sourceMappingURL=types.d.ts.map