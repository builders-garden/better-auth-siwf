var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { notificationDetailsSchema } from "@farcaster/miniapp-core";
import { createClient } from "@farcaster/quick-auth";
import { logger } from "better-auth";
import { APIError } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { mergeSchema } from "better-auth/db";
import { createAuthEndpoint } from "better-auth/plugins";
import { z } from "zod";
import { siwfClient } from "./client.js";
import { schema } from "./schema.js";
const siwf = (options) => ({
    id: "siwf",
    schema: mergeSchema(schema, options === null || options === void 0 ? void 0 : options.schema),
    endpoints: {
        verifyToken: createAuthEndpoint("/siwf/verify", {
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
                                        required: [
                                            "fid",
                                            "username",
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
                                                type: "object",
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
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const { token, user: userFromClient } = ctx.body;
            try {
                // Verify SIWF token
                const quickAuthClient = createClient();
                const siwfVerification = yield quickAuthClient.verifyJwt({
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
                                    username: (_c = userFromClient.username) !== null && _c !== void 0 ? _c : fid.toString(),
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
                        const { custodyAddress, verifiedAddresses } = (_e = (yield ((_d = options.resolveFarcasterUser) === null || _d === void 0 ? void 0 : _d.call(options, {
                            fid,
                        })))) !== null && _e !== void 0 ? _e : {};
                        const primaryEthWallet = (_g = (_f = verifiedAddresses === null || verifiedAddresses === void 0 ? void 0 : verifiedAddresses.primary) === null || _f === void 0 ? void 0 : _f.ethAddress) !== null && _g !== void 0 ? _g : custodyAddress;
                        if (primaryEthWallet && custodyAddress) {
                            const userId = user.id;
                            yield ctx.context.adapter.create({
                                model: "walletAddress",
                                data: [
                                    {
                                        userId,
                                        address: custodyAddress,
                                        chainId: 10, // optimism
                                        isPrimary: primaryEthWallet === custodyAddress,
                                    },
                                    ...((_h = verifiedAddresses === null || verifiedAddresses === void 0 ? void 0 : verifiedAddresses.ethAddresses.map((a) => ({
                                        userId,
                                        address: a,
                                        chainId: 1, // ethereum
                                        isPrimary: primaryEthWallet === a,
                                    }))) !== null && _h !== void 0 ? _h : []),
                                ],
                            });
                        }
                    }
                }
                // Create session cookie and set it in the response
                const session = yield ctx.context.internalAdapter.createSession(user.id, ctx, undefined, {
                    fid,
                });
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
                    user: {
                        id: user.id,
                        fid,
                        name: user.name,
                        image: user.image,
                    },
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
    },
});
export { siwf, siwfClient, schema };
//# sourceMappingURL=index.js.map