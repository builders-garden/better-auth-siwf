import { notificationDetailsSchema } from "@farcaster/miniapp-core";
import { createClient } from "@farcaster/quick-auth";
import { APIError } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { mergeSchema } from "better-auth/db";
import { createAuthEndpoint } from "better-auth/plugins";
import type { BetterAuthPlugin, User } from "better-auth/types";
import { z } from "zod";
import { schema } from "./schema";
import type { FarcasterUser, SIWFPluginOptions } from "./types";

export const siwf = (options: SIWFPluginOptions) =>
	({
		id: "siwf",
		schema: mergeSchema(schema, options?.schema),
		endpoints: {
			getNonce: createAuthEndpoint(
				"/siwf/nonce",
				{
					method: "POST",
					body: z.object({
						fid: z.number(),
					}),
				},
				async (ctx) => {
					const { fid } = ctx.body;
					const nonce = await options.getNonce();
					const nonceLifetimeMs = 15 * 60 * 1000; // 15 minutes

					// Store nonce with fid context
					await ctx.context.internalAdapter.createVerificationValue({
						identifier: `siwf:${fid}`,
						value: nonce,
						expiresAt: new Date(Date.now() + nonceLifetimeMs),
					});

					return ctx.json({ nonce });
				}
			),
			verifyToken: createAuthEndpoint(
				"/siwf/verify",
				{
					method: "POST",
					body: z.object({
						token: z.string().min(1),
						user: z.object({
							fid: z.number().min(1),
							username: z.string().optional(),
							displayName: z.string().optional(),
							pfpUrl: z.string().optional(),
							notificationDetails: notificationDetailsSchema,
						}),
					}),
					requireRequest: true,
				},
				async (ctx) => {
					const { token, user: userFromClient } = ctx.body;

					try {
						// Find stored nonce with wallet address and chain ID context
						const verification =
							await ctx.context.internalAdapter.findVerificationValue(
								`siwe:${userFromClient.fid}`
							);

						if (!verification) {
							throw new APIError("UNAUTHORIZED", {
								status: 401,
								message: "SIWF Unauthorized: Invalid nonce",
								code: "UNAUTHORIZED_INVALID_OR_EXPIRED_NONCE",
							});
						}
						// Clean up used nonce
						await ctx.context.internalAdapter.deleteVerificationValue(
							verification.id
						);

						// Ensure nonce is valid and not expired
						if (new Date() > verification.expiresAt) {
							throw new APIError("UNAUTHORIZED", {
								status: 401,
								message: "SIWF Unauthorized: Expired nonce",
								code: "UNAUTHORIZED_INVALID_OR_EXPIRED_NONCE",
							});
						}

						// Verify SIWF token
						const quickAuthClient = createClient();

						const siwfVerification = await quickAuthClient.verifyJwt({
							domain: options.domain,
							token,
						});
						if (!siwfVerification) {
							throw new APIError("UNAUTHORIZED", {
								message: "SIWF sign-in verification failed.",
							});
						}

						const fid = siwfVerification.sub;
						if (fid !== userFromClient.fid) {
							throw new APIError("UNAUTHORIZED", {
								status: 401,
								message: "SIWF Invalid Farcaster user",
							});
						}

						// Look for existing user by their wallet addresses
						let user: User | null = null;

						// Check if there's a farcaster record for this exact fid combination
						const farcasterUser: FarcasterUser | null =
							await ctx.context.adapter.findOne({
								model: "farcaster",
								where: [{ field: "fid", operator: "eq", value: fid }],
							});
						if (farcasterUser) {
							// Get the user associated with the farcaster user
							user = await ctx.context.adapter.findOne({
								model: "user",
								where: [
									{
										field: "id",
										operator: "eq",
										value: farcasterUser.userId,
									},
								],
							});
						}

						// Create new user if not exists
						if (!user) {
							user = await ctx.context.internalAdapter.createUser({
								name: userFromClient.username ?? fid.toString(),
								image: userFromClient.pfpUrl ?? undefined,
								email: `${fid}@farcaster.emails`,
							});

							// Create farcaster record if not exists
							if (!farcasterUser) {
								await Promise.all([
									// Create farcaster record
									ctx.context.adapter.create({
										model: "farcaster",
										data: {
											userId: user.id,
											fid,
											username: userFromClient.username ?? fid.toString(),
											displayName: userFromClient.displayName,
											avatarUrl: userFromClient.pfpUrl,
											notificationDetails: userFromClient.notificationDetails,
											createdAt: new Date(),
											updatedAt: new Date(),
										},
									}),
									// Create account record for farcaster authentication
									ctx.context.internalAdapter.createAccount({
										userId: user.id,
										providerId: "farcaster",
										accountId: `farcaster:${fid}`,
										createdAt: new Date(),
										updatedAt: new Date(),
									}),
								]);

								// Also save wallet addresses in db
								const { custodyAddress, verifiedAddresses } =
									(await options.resolveFarcasterUser?.({
										fid,
									})) ?? {};
								const primaryEthWallet =
									verifiedAddresses?.primary?.ethAddress ?? custodyAddress;
								if (primaryEthWallet && custodyAddress) {
									const userId = user.id;
									await ctx.context.adapter.create({
										model: "walletAddress",
										data: [
											{
												userId,
												address: custodyAddress,
												chainId: 10, // optimism
												isPrimary: primaryEthWallet === custodyAddress,
											},
											...(verifiedAddresses?.ethAddresses.map((a) => ({
												userId,
												address: a,
												chainId: 1, // ethereum
												isPrimary: primaryEthWallet === a,
											})) ?? []),
										],
									});
								}
							}
						}

						// Create session cookie and set it in the response
						const session = await ctx.context.internalAdapter.createSession(
							user.id,
							ctx
						);
						if (!session) {
							throw new APIError("INTERNAL_SERVER_ERROR", {
								status: 500,
								message: "SIWF Internal Server Error",
							});
						}

						await setSessionCookie(ctx, { session, user }, false, {
							secure: true,
							sameSite: "none", // Farcaster MiniApp requires this
							httpOnly: true,
							path: "/",
						});

						return ctx.json({
							success: true,
							token: session.token,
							user: {
								id: user.id,
								fid,
								name: user.name,
								image: user.image,
							},
						});
					} catch (error: unknown) {
						console.log("error happened", error);
						if (error instanceof APIError) {
							throw error;
						}
						throw new APIError("UNAUTHORIZED", {
							status: 401,
							message: "SIWF Something went wrong. Please try again later.",
							error: error instanceof Error ? error.message : "Unknown error",
						});
					}
				}
			),
		},
	}) satisfies BetterAuthPlugin;
