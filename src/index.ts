import { createClient } from "@farcaster/quick-auth";
import { logger } from "better-auth";
import { APIError, sessionMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { mergeSchema } from "better-auth/db";
import { createAuthEndpoint } from "better-auth/plugins";
import type { Account, BetterAuthPlugin, User } from "better-auth/types";
import { z } from "zod";
import { schema } from "./schema.js";
import type { FarcasterUser, SIWFPluginOptions } from "./types.js";

export type {
	FarcasterUser,
	SIWFPluginOptions,
	SIWFSignInAuthData,
	SIWFSignInResponse,
} from "./types.js";

/**
 * Farcaster SIWF authentication plugin for Better Auth.
 *
 * @example
 * ```ts
 * import { siwf } from "better-auth-siwf";
 *
 * const auth = betterAuth({
 *   plugins: [siwf({ hostname: "example.com" })],
 * });
 * ```
 */
export const siwf = (options: SIWFPluginOptions): BetterAuthPlugin => ({
	id: "siwf",
	schema: mergeSchema(schema, options?.schema),
	endpoints: {
		signInWithFarcaster: createAuthEndpoint(
			"/siwf/signin",
			{
				method: "POST",
				body: z.object({
					token: z.string().min(1),
					user: z.object({
						fid: z.number().min(1),
						username: z.string().optional(),
						displayName: z.string().optional(),
						pfpUrl: z.string().optional(),
						notificationDetails: z
							.array(
								z.object({
									appFid: z.number(),
									url: z.string(),
									token: z.string(),
								}),
							)
							.optional(),
					}),
				}),
				requireRequest: true,
				metadata: {
					openapi: {
						summary: "Verify SIWF token",
						description: "Verify SIWF token",
						tags: ["siwf"],
						parameters: [
							{
								name: "token",
								in: "query",
								required: true,
								schema: {
									type: "object",
									required: ["token", "user"],
									properties: {
										token: {
											type: "string",
											description: "SIWF token",
										},
										user: {
											type: "object",
											required: ["fid", "username"],
											optional: [
												"displayName",
												"pfpUrl",
												"notificationDetails",
											],
											properties: {
												fid: {
													type: "number",
													description: "Farcaster user ID",
												},
												username: {
													type: "string",
													description: "Farcaster username",
												},
												displayName: {
													type: "string",
													description: "Farcaster display name",
												},
												pfpUrl: {
													type: "string",
													description: "Farcaster profile picture URL",
												},
												notificationDetails: {
													type: "array",
													description: "Farcaster notification details",
												},
											},
										},
									},
								},
							},
						],
						responses: {
							200: {
								description: "SIWF token verified",
								content: {
									"application/json": {
										schema: {
											type: "object",
											required: ["success", "token", "user"],
											properties: {
												success: {
													type: "boolean",
													description: "Whether the SIWF token was verified",
												},
												token: {
													type: "string",
													description:
														"Session token for the authenticated session",
												},
												user: {
													$ref: "#/components/schemas/User",
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
			async (ctx) => {
				const { token, user: userFromClient } = ctx.body;

				try {
					// Verify SIWF token
					const quickAuthClient = createClient();

					const siwfVerification = await quickAuthClient.verifyJwt({
						domain: options.hostname,
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

					// Look for existing user by their fid
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
							farcasterFid: fid,
							farcasterUsername: userFromClient.username ?? fid.toString(),
							farcasterDisplayName: userFromClient.displayName ?? undefined,
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
										notificationDetails:
											userFromClient.notificationDetails ?? [],
										createdAt: new Date(),
										updatedAt: new Date(),
									},
								}),
								// Create account record for farcaster authentication
								ctx.context.internalAdapter.createAccount({
									userId: user.id,
									providerId: "farcaster",
									accountId: `farcaster:${fid}`,
									farcasterFid: fid,
									farcasterUsername: userFromClient.username ?? fid.toString(),
									farcasterDisplayName: userFromClient.displayName ?? undefined,
									createdAt: new Date(),
									updatedAt: new Date(),
								}),
								// update user with Farcaster account details
								ctx.context.adapter.update({
									model: "user",
									where: [{ field: "id", value: user.id }],
									update: {
										farcasterFid: fid,
										farcasterUsername:
											userFromClient.username ?? fid.toString(),
										farcasterDisplayName:
											userFromClient.displayName ?? undefined,
										updatedAt: new Date(),
									},
								}),
							]);
						}
					}

					// Create session cookie and set it in the response
					const session = await ctx.context.internalAdapter.createSession(
						user.id,
						ctx,
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
						user,
					});
				} catch (error: unknown) {
					logger.error("SIWF error happened", error);
					if (error instanceof APIError) {
						throw error;
					}
					throw new APIError("UNAUTHORIZED", {
						status: 401,
						message: "SIWF Something went wrong. Please try again later.",
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			},
		),
		linkFarcaster: createAuthEndpoint(
			"/siwf/link",
			{
				method: "POST",
				use: [sessionMiddleware],
				body: z.object({
					token: z.string().min(1),
					user: z.object({
						fid: z.number().min(1),
						username: z.string().optional(),
						displayName: z.string().optional(),
						pfpUrl: z.string().optional(),
						notificationDetails: z
							.array(
								z.object({
									appFid: z.number(),
									url: z.string(),
									token: z.string(),
								}),
							)
							.optional(),
					}),
				}),
				requireRequest: true,
				metadata: {
					openapi: {
						summary: "Link SIWF token",
						description: "Link SIWF token to a Better Auth user",
						tags: ["siwf"],
						parameters: [
							{
								name: "token",
								in: "query",
								required: true,
								schema: {
									type: "object",
									required: ["token", "user"],
									properties: {
										token: {
											type: "string",
											description: "SIWF token",
										},
										user: {
											type: "object",
											required: ["fid", "username"],
											optional: [
												"displayName",
												"pfpUrl",
												"notificationDetails",
											],
											properties: {
												fid: {
													type: "number",
													description: "Farcaster user ID",
												},
												username: {
													type: "string",
													description: "Farcaster username",
												},
												displayName: {
													type: "string",
													description: "Farcaster display name",
												},
												pfpUrl: {
													type: "string",
													description: "Farcaster profile picture URL",
												},
												notificationDetails: {
													type: "array",
													description: "Farcaster notification details",
												},
											},
										},
									},
								},
							},
						],
						responses: {
							200: {
								description: "SIWF token verified",
								content: {
									"application/json": {
										schema: {
											type: "object",
											required: ["success", "token", "user"],
											properties: {
												success: {
													type: "boolean",
													description: "Whether the SIWF token was verified",
												},
												token: {
													type: "string",
													description:
														"Session token for the authenticated session",
												},
												user: {
													$ref: "#/components/schemas/User",
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
			async (ctx) => {
				try {
					if (options.allowUserToLink === false) {
						throw new APIError("UNAUTHORIZED", {
							message: "Linking Farcaster accounts is disabled.",
						});
					}

					const session = ctx.context.session;
					if (!session?.user?.id) {
						throw new APIError("UNAUTHORIZED", {
							message: "Not authenticated.",
						});
					}

					const { token, user: userFromClient } = ctx.body;

					// Verify SIWF token
					const quickAuthClient = createClient();
					const siwfVerification = await quickAuthClient.verifyJwt({
						domain: options.hostname,
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

					const existingAccount = await ctx.context.adapter.findOne({
						model: "account",
						where: [
							{ field: "providerId", value: "farcaster" },
							{ field: "accountId", value: `farcaster:${fid}` },
						],
					});

					if (existingAccount) {
						if ((existingAccount as Account).userId !== session.user.id) {
							throw new APIError("UNAUTHORIZED", {
								status: 409,
								message: "This account is already linked to another user.",
							});
						}
						throw new APIError("UNAUTHORIZED", {
							status: 409,
							message:
								"This Farcaster account is already linked to your account",
						});
					}

					const existingFarcaster = (await ctx.context.adapter.findOne({
						model: "farcaster",
						where: [{ field: "fid", value: fid }],
					})) as FarcasterUser | null;

					if (
						existingFarcaster &&
						existingFarcaster.userId !== session.user.id
					) {
						throw new APIError("UNAUTHORIZED", {
							status: 409,
							message:
								"This Farcaster account is already linked to another user",
						});
					}

					if (!existingFarcaster) {
						await ctx.context.adapter.create({
							model: "farcaster",
							data: {
								userId: session.user.id,
								fid,
								username: userFromClient.username ?? fid.toString(),
								displayName: userFromClient.displayName,
								avatarUrl: userFromClient.pfpUrl,
								notificationDetails: userFromClient.notificationDetails ?? [],
								createdAt: new Date(),
								updatedAt: new Date(),
							},
						});
					}

					// Link Farcaster account to user
					await ctx.context.adapter.create({
						model: "account",
						data: {
							userId: session.user.id,
							providerId: "farcaster",
							accountId: `farcaster:${fid}`,
							farcasterFid: fid,
							farcasterUsername: userFromClient.username ?? fid.toString(),
							farcasterDisplayName: userFromClient.displayName,
						},
					});

					// Update user with Farcaster account details
					await ctx.context.adapter.update({
						model: "user",
						where: [{ field: "id", value: session.user.id }],
						update: {
							farcasterFid: fid,
							farcasterUsername: userFromClient.username ?? fid.toString(),
							farcasterDisplayName: userFromClient.displayName ?? null,
						},
					});

					return ctx.json({
						success: true,
						message: "Farcaster account linked successfully",
					});
				} catch (error: unknown) {
					logger.error("SIWF link error happened", error);
					if (error instanceof APIError) {
						throw error;
					}
					throw new APIError("UNAUTHORIZED", {
						status: 500,
						message:
							"SIWF Something went wrong while linking Farcaster account. Please try again later.",
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			},
		),
		unlinkFarcaster: createAuthEndpoint(
			"/siwf/unlink",
			{
				method: "POST",
				use: [sessionMiddleware],
				requireRequest: true,
				metadata: {
					openapi: {
						summary: "Unlink Farcaster account (SIWF)",
						description:
							"Unlink the Farcaster account from the authenticated user",
						tags: ["siwf"],
						responses: {
							200: {
								description: "Farcaster account unlinked",
								content: {
									"application/json": {
										schema: {
											type: "object",
											required: ["success", "message"],
											properties: {
												success: { type: "boolean" },
												message: { type: "string" },
											},
										},
									},
								},
							},
						},
					},
				},
			},
			async (ctx) => {
				try {
					const session = ctx.context.session;
					if (!session?.user?.id) {
						throw new APIError("UNAUTHORIZED", {
							message: "Not authenticated.",
						});
					}

					// Find linked Farcaster account
					const account = await ctx.context.adapter.findOne({
						model: "account",
						where: [
							{ field: "userId", value: session.user.id },
							{ field: "providerId", value: "farcaster" },
						],
					});

					if (!account) {
						throw new APIError("NOT_FOUND", {
							status: 404,
							message: "The user does not have a Farcaster account linked.",
						});
					}

					await ctx.context.adapter.delete({
						model: "account",
						where: [{ field: "id", value: (account as Account).id }],
					});

					// Remove Farcaster profile record if exists
					const farcasterProfile = await ctx.context.adapter.findOne({
						model: "farcaster",
						where: [{ field: "userId", value: session.user.id }],
					});
					if (farcasterProfile) {
						await ctx.context.adapter.delete({
							model: "farcaster",
							where: [
								{ field: "id", value: (farcasterProfile as FarcasterUser).id },
							],
						});
					}

					// Remove Farcaster information from user record
					await ctx.context.adapter.update({
						model: "user",
						where: [{ field: "id", value: session.user.id }],
						update: {
							farcasterFid: null,
							farcasterUsername: null,
							farcasterDisplayName: null,
						},
					});

					return ctx.json({
						success: true,
						message: "Farcaster account unlinked successfully",
					});
				} catch (error: unknown) {
					logger.error("SIWF unlink error happened", error);
					if (error instanceof APIError) {
						throw error;
					}
					throw new APIError("UNAUTHORIZED", {
						status: 500,
						message:
							"SIWF Something went wrong while unlinking Farcaster account. Please try again later.",
						error: error instanceof Error ? error.message : "Unknown error",
					});
				}
			},
		),
	},
});
