import type { BetterAuthDBSchema } from "better-auth/db";
import { z } from "zod";

export const schema = {
	user: {
		modelName: "user",
		fields: {
			farcasterFid: {
				type: "number",
				required: false,
				unique: true,
			},
			farcasterUsername: {
				type: "string",
				required: false,
			},
			farcasterDisplayName: {
				type: "string",
				required: false,
			},
		},
	},
	account: {
		modelName: "account",
		fields: {
			farcasterFid: {
				type: "number",
				required: false,
				unique: true,
			},
			farcasterUsername: {
				type: "string",
				required: false,
			},
			farcasterDisplayName: {
				type: "string",
				required: false,
			},
		},
	},
	farcaster: {
		modelName: "farcaster",
		fields: {
			userId: {
				type: "string",
				references: {
					model: "user",
					field: "id",
				},
				required: true,
			},
			fid: {
				type: "number",
				required: true,
				unique: true,
			},
			username: {
				type: "string",
				required: false,
			},
			displayName: {
				type: "string",
				required: false,
			},
			avatarUrl: {
				type: "string",
				required: false,
			},
			notificationDetails: {
				type: "json",
				required: false,
				validator: {
					input: z.array(
						z.object({
							appFid: z.number(),
							url: z.string(),
							token: z.string(),
						}),
					),
				},
				defaultValue: [],
			},
			createdAt: {
				type: "date",
				required: true,
			},
			updatedAt: {
				type: "date",
				required: true,
			},
		},
	},
} satisfies BetterAuthDBSchema;
