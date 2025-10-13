export const schema = {
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
    // SIWE schema https://github.com/better-auth/better-auth/blob/canary/packages/better-auth/src/plugins/siwe/schema.ts
    walletAddress: {
        modelName: "walletAddress",
        fields: {
            userId: {
                type: "string",
                required: true,
                references: {
                    model: "user",
                    field: "id",
                },
            },
            address: {
                type: "string",
                required: true,
            },
            chainId: {
                type: "number",
                required: false,
            },
            isPrimary: {
                type: "boolean",
                defaultValue: false,
            },
            createdAt: {
                type: "date",
                required: true,
            },
        },
    },
};
//# sourceMappingURL=schema.js.map