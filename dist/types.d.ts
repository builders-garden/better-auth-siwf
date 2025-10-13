import type { MiniAppNotificationDetails } from "@farcaster/miniapp-core";
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
    getNonce: () => Promise<string>;
    resolveFarcasterUser?: (args: ResolveFarcasterUserArgs) => Promise<ResolveFarcasterUserResult | null>;
    schema?: InferOptionSchema<typeof schema>;
};
/**
 * SIWF Client Type
 */
export type SIWFGetNonceResponse = {
    data: {
        nonce: string;
    };
};
export type SIWFVerifyArgs = {
    token: string;
    user: {
        fid: number;
        username?: string;
        displayName?: string;
        pfpUrl?: string;
        notificationDetails?: MiniAppNotificationDetails;
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
export type SIWFClientType = {
    siwf: {
        getNonce: () => Promise<SIWFGetNonceResponse>;
        verify: (args: SIWFVerifyArgs) => Promise<SIWFVerifyResponse>;
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
    notificationDetails?: MiniAppNotificationDetails;
    createdAt: Date;
    updatedAt: Date;
};
//# sourceMappingURL=types.d.ts.map