import type { BetterFetchResponse } from "@better-fetch/fetch";
import type { BetterAuthClientPlugin } from "better-auth";
import type { siwf } from "./index.js";
import type {
	SIWFLinkResponse,
	SIWFSignInAuthData,
	SIWFSignInResponse,
	SIWFUnlinkResponse,
} from "./types.js";

type SIWFPlugin = typeof siwf;

/**
 * Client plugin for Sign In With Farcaster
 */
export const siwfClient = () =>
	({
		id: "siwf",
		$InferServerPlugin: {} as ReturnType<SIWFPlugin>,
		getActions: ($fetch) => ({
			/**
			 * Sign in with Farcaster
			 * @param authData - Authenticated data from the Farcaster MiniApp SDK
			 * @returns BetterFetchResponse<SIWFSignInResponse>
			 * @throws APIError if the sign in fails
			 */
			signInWithFarcaster: async (
				authData: SIWFSignInAuthData,
			): Promise<BetterFetchResponse<SIWFSignInResponse>> => {
				const response = await $fetch<SIWFSignInResponse>("/siwf/signin", {
					method: "POST",
					body: authData,
				});

				return response;
			},

			/**
			 * Link current user account with Farcaster
			 * @param authData - Authenticated data from the Farcaster MiniApp SDK
			 * @returns BetterFetchResponse<SIWFLinkResponse>
			 * @throws APIError if the link fails
			 */
			linkFarcaster: async (
				authData: SIWFSignInAuthData,
			): Promise<BetterFetchResponse<SIWFLinkResponse>> => {
				const response = await $fetch<SIWFLinkResponse>("/siwf/link", {
					method: "POST",
					body: authData,
				});

				return response;
			},

			/**
			 * Unlink current user account from Farcaster
			 * @returns BetterFetchResponse<SIWFUnlinkResponse>
			 * @throws APIError if the unlink fails
			 */
			unlinkFarcaster: async (): Promise<
				BetterFetchResponse<SIWFUnlinkResponse>
			> => {
				const response = await $fetch<SIWFUnlinkResponse>("/siwf/unlink", {
					method: "POST",
				});

				return response;
			},
		}),
	}) satisfies BetterAuthClientPlugin;

export default siwfClient;
