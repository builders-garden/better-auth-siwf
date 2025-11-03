# Better Auth – Sign In With Farcaster (SIWF)

Authenticate users via Farcaster using Better Auth. This plugin mirrors the developer experience of the official SIWE plugin while adapting flows and schema to Farcaster identities.

- Server plugin: `siwf`
- Client plugin: `siwfClient`
- REST endpoints: `POST /siwf/verify`, `POST /siwf/create` (admin only)

References: see the official SIWE plugin docs for structure and expectations and an earlier community attempt for Farcaster-specific ideas: [SIWE Plugin Docs](https://www.better-auth.com/docs/plugins/siwe), it's also an expansion of this other plugin [Farcaster Auth Plugin](https://github.com/iamlotp/Farcaster-Auth-Plugin-Better-Auth-).

## Installation

```bash
npm i @buildersgarden/better-auth-siwf
```

## Server Setup

Add the SIWF plugin to your Better Auth configuration.

```ts
// auth.ts
import { betterAuth } from "better-auth";
import { generateRandomString } from "better-auth/crypto";
import { siwf, type ResolveFarcasterUserResult } from "@buildersgarden/better-auth-siwf";

export const auth = betterAuth({
  // database: { ... } // your DB config
  plugins: [
    siwf({
      // must match the domain used when verifying the Farcaster JWT
      domain: "app.example.com",
      // required to enable the admin endpoint POST /siwf/create
      getAdminKey: () => process.env.BETTER_AUTH_ADMIN_KEY || "",
       
      // Optional: resolve the user data and wallets from neynar for example
      // see neynar docs: https://docs.neynar.com/reference/fetch-bulk-users
      resolveFarcasterUser: async ({ fid }): Promise<ResolveFarcasterUserResult | null> => {
        const data = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk/?fids=${fid}`,
          {
            headers: {
              "x-api-key": process.env.NEYNAR_API_KEY || "NEYNAR_API_DOCS",
            },
          }
        ).then(async (data) => await data.json());

        if (!data || data.users.length === 0) {
          return null;
        }
        
        const user = data.users[0];
        return {
          fid,
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.pfp_url,
          custodyAddress: user.custody_address,
          verifiedAddresses: {
            primary: {
              ethAddress:
                user.verified_addresses.primary.eth_address ?? undefined,
              solAddress:
                user.verified_addresses.primary.sol_address ?? undefined,
            },
            ethAddresses: user.verified_addresses?.eth_addresses ?? undefined,
            solAddresses: user.verified_addresses?.sol_addresses ?? undefined,
          },
        } satisfies ResolveFarcasterUserResult;
      }
    })
  ]
});
```

### What the plugin does
- Exposes `POST /siwf/verify` to verify a Farcaster Quick Auth JWT and establish a Better Auth session cookie.
- Creates a `user` if one does not exist, associates it with a `farcaster` record, and (optionally) stores wallet addresses.
- Sets a secure session cookie with `SameSite: "none"` for Farcaster MiniApp compatibility.

## Client Setup

Add the client plugin so the Better Auth client exposes SIWF endpoints.

```ts
// auth-client.ts
import { createAuthClient } from "better-auth/react";
import { siwfClient, type SIWFClientType } from "@buildersgarden/better-auth-siwf";

const client = createAuthClient({
  plugins: [siwfClient()]
});

// Type the client to include custom farcaster methods
export const authClient = client as typeof client & SIWFClientType;
```

## Usage

### 1) Obtain a Farcaster JWT token on the client
Use Farcaster Quick Auth (within a Farcaster MiniApp) to obtain a signed JWT for your domain. Ensure the `domain` used here matches the server plugin `domain`.

```ts
const result = await miniappSdk.quickAuth.getToken(); // result: { token: string }
```


### 2) Verify and sign in
Send the token and user details to the Better Auth server. On success, the Better Auth session cookie is set.

```ts
const ctx = await miniappSdk.context;
const { data } = await authClient.siwf.verifyToken({
  token: result.token,
  user: {
    ...ctx.user
    notificationDetails: ctx.client.notificationDetails ?? undefined,
  }
});

// data.success === true
// data.user -> { id, fid, name, image }
```

All together:
```ts
import { sdk as miniappSdk } from "@farcaster/miniapp-sdk";
import { authClient } from "@/lib/auth-client";

const farcasterSignIn = async () => {
  const isInMiniapp = await miniappSdk.isInMiniApp();
  if (!isInMiniapp) {
    return;
  }

  const ctx = await miniappSdk.context;
  
  // 1. Obtain a Farcaster JWT token on the client
  const result = await miniappSdk.quickAuth.getToken();
  if (!result || !result.token) {
    throw new Error("Failed to get token");
  }

  // 2. Verify and sign in with the Better Auth server
  const { data } = await authClient.siwf.verifyToken({
    token: result.token,
    user: {
      ...ctx.user
      notificationDetails: ctx.client.notificationDetails ?? undefined,
    }
  });
  if (!data.success) {
    throw new Error("Failed to verify token");
  }
  console.log("Signed in", data.user);
};

```

### Admin: Create a Farcaster user (no sign-in)

This endpoint lets you create a user for a given `fid` using your resolver (e.g., Neynar) without requiring a Quick Auth token. It is protected by an admin header.

- Path: `POST /siwf/create`
- Header: `x-better-auth-admin-key: <your-admin-key>` (must match `getAdminKey()` return value)
- Body: `{ fid: number }`

Example (curl):

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-better-auth-admin-key: $BETTER_AUTH_ADMIN_KEY" \
  -d '{"fid": 12345}' \
  https://your-api.example.com/api/auth/siwf/create
```

Client example:

```ts
const { data, error } = await authClient.$fetch("/siwf/create", {
  method: "POST",
  headers: {
    "x-better-auth-admin-key": process.env.NEXT_PUBLIC_BETTER_AUTH_ADMIN_KEY!,
  },
  body: { fid: 12345 },
  throw: false,
});
```

## Configuration Options

Server options accepted by `siwf`:

- `domain` (string, required): Domain expected in the Farcaster JWT. Must match exactly.
- `getAdminKey` (function, required for admin endpoint): Returns the string key used to authorize `POST /siwf/create`.
- `resolveFarcasterUser` (optional): Enrich user record with Farcaster profile and wallet addresses. If provided, the plugin will also persist wallet addresses in `walletAddress`.
- `schema` (optional): Extend or override the default plugin schema via Better Auth `mergeSchema`.

Client plugin `siwfClient` has no options; it exposes the plugin namespace in the Better Auth client.

## Database Schema

This plugin merges the following tables into your Better Auth schema.

### `farcaster`

| Field                | Type    | Notes                              |
|----------------------|---------|------------------------------------|
| userId               | string  | References `user.id` (required)    |
| fid                  | number  | Unique Farcaster ID (required)     |
| username             | string  | Optional                            |
| displayName          | string  | Optional                            |
| avatarUrl            | string  | Optional                            |
| notificationDetails  | json    | Optional (MiniApp notification array)     |
| createdAt            | date    | Required                            |
| updatedAt            | date    | Required                            |

### `walletAddress` (from SIWE schema pattern)

| Field     | Type    | Notes                                           |
|-----------|---------|-------------------------------------------------|
| userId    | string  | References `user.id` (required)                 |
| address   | string  | Wallet address (required)                       |
| chainId   | number  | Optional (e.g., 1 for Ethereum, 10 for Optimism) |
| isPrimary | boolean | Defaults to `false`                             |
| createdAt | date    | Required                                        |

### Migrations

Use the Better Auth CLI to migrate or generate schema:

```bash
npx @better-auth/cli migrate
# or
npx @better-auth/cli generate
```

Alternatively, add the fields manually based on the tables above.

## Security Notes

- The server verifies Farcaster JWTs with the configured `domain`. Mismatched domains will fail.
- Session cookies are set with `secure: true`, `httpOnly: true`, and `sameSite: "none"` for MiniApp compatibility. Serve over HTTPS.
- The plugin @farcaster/quick-auth ensures the JWT `sub` (subject) matches the provided `fid` before issuing a session.

## Troubleshooting

- 401 "Invalid Farcaster user": The JWT subject must equal the provided `fid`.
- No session cookie set: In embedded contexts (MiniApps), ensure third-party cookies are allowed and your server uses HTTPS with `SameSite: none`.
- Domain mismatch: The JWT must be issued for the same `domain` configured in the plugin.

## Acknowledgements

- Structure and schema patterns inspired by the official Better Auth SIWE plugin: [SIWE Plugin Docs](https://www.better-auth.com/docs/plugins/siwe)
- Community exploration for Farcaster auth flows: [Community Farcaster Auth Plugin](https://github.com/iamlotp/Farcaster-Auth-Plugin-Better-Auth-/blob/master/README.md)
