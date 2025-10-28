import { z } from "zod";
export declare const schema: {
    farcaster: {
        modelName: string;
        fields: {
            userId: {
                type: "string";
                references: {
                    model: string;
                    field: string;
                };
                required: true;
            };
            fid: {
                type: "number";
                required: true;
                unique: true;
            };
            username: {
                type: "string";
                required: false;
            };
            displayName: {
                type: "string";
                required: false;
            };
            avatarUrl: {
                type: "string";
                required: false;
            };
            notificationDetails: {
                type: "json";
                required: false;
                validator: {
                    input: z.ZodArray<z.ZodCustom<{
                        url: string;
                        token: string;
                    }, {
                        url: string;
                        token: string;
                    }>>;
                };
                defaultValue: never[];
            };
            createdAt: {
                type: "date";
                required: true;
            };
            updatedAt: {
                type: "date";
                required: true;
            };
        };
    };
    walletAddress: {
        modelName: string;
        fields: {
            userId: {
                type: "string";
                required: true;
                references: {
                    model: string;
                    field: string;
                };
            };
            address: {
                type: "string";
                required: true;
            };
            chainId: {
                type: "number";
                required: false;
            };
            isPrimary: {
                type: "boolean";
                defaultValue: false;
            };
            createdAt: {
                type: "date";
                required: true;
            };
        };
    };
};
//# sourceMappingURL=schema.d.ts.map