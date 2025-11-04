var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Client plugin for Sign In With Farcaster
 */
export const siwfClient = () => ({
    id: "siwf",
    $InferServerPlugin: {},
    getActions: ($fetch) => ({
        /**
         * Sign in with Farcaster
         * @param authData - Authenticated data from the Farcaster MiniApp SDK
         * @returns
         */
        signInWithFarcaster: (authData) => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield $fetch("/siwf/signin", {
                method: "POST",
                body: authData,
            });
            return response;
        }),
        /**
         * Link current user account with Farcaster
         * @param authData - Authenticated data from the Farcaster MiniApp SDK
         * @returns
         */
        linkFarcaster: (authData) => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield $fetch("/siwf/link", {
                method: "POST",
                body: authData,
            });
            return response;
        }),
        /**
         * Unlink current user account from Farcaster
         * @returns
         */
        unlinkFarcaster: () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield $fetch("/siwf/unlink", {
                method: "POST",
            });
            return response;
        }),
    }),
});
export default siwfClient;
//# sourceMappingURL=client.js.map