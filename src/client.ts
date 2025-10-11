import type { BetterAuthClientPlugin } from "better-auth";
import type { siwf } from "./index.js";

export const siwfClient = () =>
	({
		id: "siwf",
		$InferServerPlugin: {} as ReturnType<typeof siwf>,
	}) satisfies BetterAuthClientPlugin;
