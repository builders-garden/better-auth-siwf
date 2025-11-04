var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createClient } from "@farcaster/quick-auth";
import { logger } from "better-auth";
import { APIError, sessionMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { mergeSchema } from "better-auth/db";
import { createAuthEndpoint } from "better-auth/plugins";
import { z } from "zod";
import { schema } from "./schema.js";
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
export const siwf = (options) => ({
    id: "siwf",
    schema: mergeSchema(schema, options === null || options === void 0 ? void 0 : options.schema),
    endpoints: {
        signInWithFarcaster: createAuthEndpoint("/siwf/signin", {
            method: "POST",
            body: z.object({
                token: z.string().min(1),
                user: z.object({
                    fid: z.number().min(1),
                    username: z.string().optional(),
                    displayName: z.string().optional(),
                    pfpUrl: z.string().optional(),
                    notificationDetails: z
                        .array(z.object({
                        appFid: z.number(),
                        url: z.string(),
                        token: z.string(),
                    }))
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
                                                description: "Session token for the authenticated session",
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
        }, (ctx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const { token, user: userFromClient } = ctx.body;
            try {
                // Verify SIWF token
                const quickAuthClient = createClient();
                const siwfVerification = yield quickAuthClient.verifyJwt({
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
                let user = null;
                // Check if there's a farcaster record for this exact fid combination
                const farcasterUser = yield ctx.context.adapter.findOne({
                    model: "farcaster",
                    where: [{ field: "fid", operator: "eq", value: fid }],
                });
                if (farcasterUser) {
                    // Get the user associated with the farcaster user
                    user = yield ctx.context.adapter.findOne({
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
                    user = yield ctx.context.internalAdapter.createUser({
                        name: (_a = userFromClient.username) !== null && _a !== void 0 ? _a : fid.toString(),
                        image: (_b = userFromClient.pfpUrl) !== null && _b !== void 0 ? _b : undefined,
                        email: `${fid}@farcaster.emails`,
                        farcasterFid: fid,
                        farcasterUsername: (_c = userFromClient.username) !== null && _c !== void 0 ? _c : fid.toString(),
                        farcasterDisplayName: (_d = userFromClient.displayName) !== null && _d !== void 0 ? _d : undefined,
                    });
                    // Create farcaster record if not exists
                    if (!farcasterUser) {
                        yield Promise.all([
                            // Create farcaster record
                            ctx.context.adapter.create({
                                model: "farcaster",
                                data: {
                                    userId: user.id,
                                    fid,
                                    username: (_e = userFromClient.username) !== null && _e !== void 0 ? _e : fid.toString(),
                                    displayName: userFromClient.displayName,
                                    avatarUrl: userFromClient.pfpUrl,
                                    notificationDetails: (_f = userFromClient.notificationDetails) !== null && _f !== void 0 ? _f : [],
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
                                farcasterUsername: (_g = userFromClient.username) !== null && _g !== void 0 ? _g : fid.toString(),
                                farcasterDisplayName: (_h = userFromClient.displayName) !== null && _h !== void 0 ? _h : undefined,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            }),
                            // update user with Farcaster account details
                            ctx.context.adapter.update({
                                model: "user",
                                where: [{ field: "id", value: user.id }],
                                update: {
                                    farcasterFid: fid,
                                    farcasterUsername: (_j = userFromClient.username) !== null && _j !== void 0 ? _j : fid.toString(),
                                    farcasterDisplayName: (_k = userFromClient.displayName) !== null && _k !== void 0 ? _k : undefined,
                                    updatedAt: new Date(),
                                },
                            }),
                        ]);
                    }
                }
                // Create session cookie and set it in the response
                const session = yield ctx.context.internalAdapter.createSession(user.id, ctx);
                if (!session) {
                    throw new APIError("INTERNAL_SERVER_ERROR", {
                        status: 500,
                        message: "SIWF Internal Server Error",
                    });
                }
                yield setSessionCookie(ctx, { session, user }, false, {
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
            }
            catch (error) {
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
        })),
        linkFarcaster: createAuthEndpoint("/siwf/link", {
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
                        .array(z.object({
                        appFid: z.number(),
                        url: z.string(),
                        token: z.string(),
                    }))
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
                                                description: "Session token for the authenticated session",
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
        }, (ctx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                if (options.allowUserToLink === false) {
                    throw new APIError("UNAUTHORIZED", {
                        message: "Linking Farcaster accounts is disabled.",
                    });
                }
                const session = ctx.context.session;
                if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
                    throw new APIError("UNAUTHORIZED", {
                        message: "Not authenticated.",
                    });
                }
                const { token, user: userFromClient } = ctx.body;
                // Verify SIWF token
                const quickAuthClient = createClient();
                const siwfVerification = yield quickAuthClient.verifyJwt({
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
                const existingAccount = yield ctx.context.adapter.findOne({
                    model: "account",
                    where: [
                        { field: "providerId", value: "farcaster" },
                        { field: "accountId", value: `farcaster:${fid}` },
                    ],
                });
                if (existingAccount) {
                    if (existingAccount.userId !== session.user.id) {
                        throw new APIError("UNAUTHORIZED", {
                            status: 409,
                            message: "This account is already linked to another user.",
                        });
                    }
                    throw new APIError("UNAUTHORIZED", {
                        status: 409,
                        message: "This Farcaster account is already linked to your account",
                    });
                }
                const existingFarcaster = (yield ctx.context.adapter.findOne({
                    model: "farcaster",
                    where: [{ field: "fid", value: fid }],
                }));
                if (existingFarcaster &&
                    existingFarcaster.userId !== session.user.id) {
                    throw new APIError("UNAUTHORIZED", {
                        status: 409,
                        message: "This Farcaster account is already linked to another user",
                    });
                }
                if (!existingFarcaster) {
                    yield ctx.context.adapter.create({
                        model: "farcaster",
                        data: {
                            userId: session.user.id,
                            fid,
                            username: (_b = userFromClient.username) !== null && _b !== void 0 ? _b : fid.toString(),
                            displayName: userFromClient.displayName,
                            avatarUrl: userFromClient.pfpUrl,
                            notificationDetails: (_c = userFromClient.notificationDetails) !== null && _c !== void 0 ? _c : [],
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                    });
                }
                // Link Farcaster account to user
                yield ctx.context.adapter.create({
                    model: "account",
                    data: {
                        userId: session.user.id,
                        providerId: "farcaster",
                        accountId: `farcaster:${fid}`,
                        farcasterFid: fid,
                        farcasterUsername: (_d = userFromClient.username) !== null && _d !== void 0 ? _d : fid.toString(),
                        farcasterDisplayName: userFromClient.displayName,
                    },
                });
                // Update user with Farcaster account details
                yield ctx.context.adapter.update({
                    model: "user",
                    where: [{ field: "id", value: session.user.id }],
                    update: {
                        farcasterFid: fid,
                        farcasterUsername: (_e = userFromClient.username) !== null && _e !== void 0 ? _e : fid.toString(),
                        farcasterDisplayName: (_f = userFromClient.displayName) !== null && _f !== void 0 ? _f : undefined,
                    },
                });
                return ctx.json({
                    success: true,
                    message: "Farcaster account linked successfully",
                });
            }
            catch (error) {
                logger.error("SIWF link error happened", error);
                if (error instanceof APIError) {
                    throw error;
                }
                throw new APIError("UNAUTHORIZED", {
                    status: 500,
                    message: "SIWF Something went wrong while linking Farcaster account. Please try again later.",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        })),
        unlinkFarcaster: createAuthEndpoint("/siwf/unlink", {
            method: "POST",
            use: [sessionMiddleware],
            requireRequest: true,
            metadata: {
                openapi: {
                    summary: "Unlink Farcaster account (SIWF)",
                    description: "Unlink the Farcaster account from the authenticated user",
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
        }, (ctx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                const session = ctx.context.session;
                if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
                    throw new APIError("UNAUTHORIZED", {
                        message: "Not authenticated.",
                    });
                }
                // Find linked Farcaster account
                const account = yield ctx.context.adapter.findOne({
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
                yield ctx.context.adapter.delete({
                    model: "account",
                    where: [{ field: "id", value: account.id }],
                });
                // Remove Farcaster profile record if exists
                const farcasterProfile = yield ctx.context.adapter.findOne({
                    model: "farcaster",
                    where: [{ field: "userId", value: session.user.id }],
                });
                if (farcasterProfile) {
                    yield ctx.context.adapter.delete({
                        model: "farcaster",
                        where: [
                            { field: "id", value: farcasterProfile.id },
                        ],
                    });
                }
                // Remove Farcaster information from user record
                yield ctx.context.adapter.update({
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
            }
            catch (error) {
                logger.error("SIWF unlink error happened", error);
                if (error instanceof APIError) {
                    throw error;
                }
                throw new APIError("UNAUTHORIZED", {
                    status: 500,
                    message: "SIWF Something went wrong while unlinking Farcaster account. Please try again later.",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        })),
    },
});
//# sourceMappingURL=index.js.map