import type { InferOptionSchema, User } from "better-auth/types";
import type { schema } from "./schema.js";

/**
 *  SIWF PLUGIN TYPES
 */
export type SIWFPluginOptions = {
	domain: string;
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
		user: User;
	};
};

export type SIWFClientType = {
	siwf: {
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
	notificationDetails?: {
		appFid: number;
		url: string;
		token: string;
	}[];
	createdAt: Date;
	updatedAt: Date;
};
