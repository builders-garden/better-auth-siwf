import type { InferOptionSchema } from "better-auth/types";
import type { schema } from "./schema.js";
/**
 *  SIWF PLUGIN TYPES
 */
export type ResolveFarcasterUserArgs = {
    fid: number;
};
export type ResolveFarcasterUserResult = {
    fid: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    custodyAddress: string;
    verifiedAddresses: {
        primary: {
            ethAddress?: string;
            solAddress?: string;
        };
        ethAddresses: string[];
        solAddresses: string[];
    };
};
export type SIWFPluginOptions = {
    domain: string;
    getAdminKey: () => string;
    resolveFarcasterUser: (args: ResolveFarcasterUserArgs) => Promise<ResolveFarcasterUserResult | null>;
    schema?: InferOptionSchema<typeof schema>;
};
/**
 * SIWF Client Type
 */
export type SIWFVerifyArgs = {
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
export type SIWFVerifyResponse = {
    data: {
        success: boolean;
        token: string;
        user: {
            id: string;
            fid: number;
            name: string;
            image?: string | null;
        };
    };
};
export type SIWFCreateArgs = {
    fid: number;
};
export type SIWFCreateResponse = {
    success: boolean;
    user: {
        id: string;
        fid: number;
        name: string;
        image?: string | null;
    };
};
export type SIWFClientType = {
    siwf: {
        verify: (args: SIWFVerifyArgs) => Promise<SIWFVerifyResponse>;
        create: (args: SIWFCreateArgs) => Promise<SIWFCreateResponse>;
    };
};
/**
 * SIWF Farcaster User
 */
export type FarcasterUser = {
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