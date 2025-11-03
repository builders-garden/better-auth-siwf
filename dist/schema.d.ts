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
                    input: z.ZodArray<z.ZodObject<{
                        appFid: z.ZodNumber;
                        url: z.ZodString;
                        token: z.ZodString;
                    }, z.core.$strip>>;
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
};
//# sourceMappingURL=schema.d.ts.map