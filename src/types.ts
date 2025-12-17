import type { BetterFetchResponse } from "@better-fetch/fetch";
import type { Account, InferOptionSchema, User } from "better-auth/types";
import type { schema } from "./schema.js";

/**
 *  SIWF PLUGIN OPTIONS
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
	/**
	 * The hostname of the server that will be used to verify the Farcaster JWT
	 */
	hostname: string;
	/**
	 * The function to use to resolve a Farcaster user via farcaster hubs
	 * @default null
	 */
	resolveFarcasterUser: (
		args: ResolveFarcasterUserArgs,
	) => Promise<ResolveFarcasterUserResult | null>;
	/**
	 * Whether the user is allowed to link their Farcaster account to their Better Auth account
	 * @default true
	 */
	allowUserToLink?: boolean;
	/**
	 * The schema to use for the SIWF plugin
	 * {@link better-auth-siwf#schema | SIWF schema}
	 */
	schema?: InferOptionSchema<typeof schema> | undefined;
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
 * SIWF Link Response, returned by the SIWF link endpoint
 * @throws APIError if the link fails
 */
export type SIWFLinkResponse = {
	data: {
		success: boolean;
		message: string;
	};
};

/**
 * SIWF Unlink Response, returned by the SIWF unlink endpoint
 * @throws APIError if the unlink fails
 */
export type SIWFUnlinkResponse = {
	data: {
		success: boolean;
		message: string;
	};
};

/**
 * SIWF Client Type, returned by the SIWF client plugin
 */
export type SIWFClientType = {
	siwf: {
		signInWithFarcaster: (
			authData: SIWFSignInAuthData,
		) => Promise<BetterFetchResponse<SIWFSignInResponse>>;
		linkFarcaster: (
			authData: SIWFSignInAuthData,
		) => Promise<BetterFetchResponse<SIWFLinkResponse>>;
		unlinkFarcaster: () => Promise<BetterFetchResponse<SIWFUnlinkResponse>>;
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

export interface WalletAddress {
	id: string;
	userId: string;
	address: string;
	chainId: number;
	isPrimary: boolean;
	createdAt: Date;
}
