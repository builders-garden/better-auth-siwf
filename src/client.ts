import type { BetterAuthClientPlugin } from "better-auth";
import type { siwf } from "./index";

export const siwfClient = () =>
	({
		id: "siwf",
		$InferServerPlugin: {} as ReturnType<typeof siwf>,
	}) satisfies BetterAuthClientPlugin;
