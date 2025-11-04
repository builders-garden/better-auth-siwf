import type { BetterAuthClientPlugin } from "better-auth";
import type { siwf } from "./index.js";
import type { SIWFSignInAuthData } from "./types.js";

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
			 * @returns
			 */
			signInWithFarcaster: async (authData: SIWFSignInAuthData) => {
				const response = await $fetch("/siwf/signin", {
					method: "POST",
					body: authData,
				});

				return response;
			},

			/**
			 * Link current user account with Farcaster
			 * @param authData - Authenticated data from the Farcaster MiniApp SDK
			 * @returns
			 */
			linkFarcaster: async (authData: SIWFSignInAuthData) => {
				const response = await $fetch("/siwf/link", {
					method: "POST",
					body: authData,
				});

				return response;
			},

			/**
			 * Unlink current user account from Farcaster
			 * @returns
			 */
			unlinkFarcaster: async () => {
				const response = await $fetch("/siwf/unlink", {
					method: "POST",
				});

				return response;
			},
		}),
	}) satisfies BetterAuthClientPlugin;

export default siwfClient;
