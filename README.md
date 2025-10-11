# Better Auth – Sign In With Farcaster (SIWF)

Authenticate users via Farcaster using Better Auth. This plugin mirrors the developer experience of the official SIWE plugin while adapting flows and schema to Farcaster identities.

- Server plugin: `siwf`
- Client plugin: `siwfClient`
- REST endpoints: `POST /siwf/nonce`, `POST /siwf/verify`

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
      
      // provide a cryptographically secure nonce
      getNonce: async () => generateRandomString(32),
      
      // Optional: resolve the user data and wallets from neynar for example
      resolveFarcasterUser: async ({ fid }): Promise<ResolveFarcasterUserResult | null> => (
        // see neynar docs for more information: https://docs.neynar.com/reference/fetch-bulk-users
        const data = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk/?fids=${fid}`,
          {
            headers: {
              "x-api-key": "NEYNAR_API_KEY",
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
      )
    })
  ]
});
```

### What the plugin does
- Exposes `POST /siwf/nonce` to mint a short-lived nonce bound to a Farcaster `fid`.
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

### 1) Generate a nonce
Before initiating Quick Auth in your Farcaster MiniApp or app, mint a nonce for the `fid`.

```ts
const { data: nonce } = await authClient.siwf.getNonce();
```

### 2) Obtain a Farcaster JWT token on the client
Use Farcaster Quick Auth (within a Farcaster MiniApp) to obtain a signed JWT for your domain. Ensure the `domain` used here matches the server plugin `domain`.

```ts
const result = await miniappSdk.quickAuth.getToken(); // result: { token: string }
```


### 3) Verify and sign in
Send the token and user details to the better authserver. On success, the Better Auth session cookie is set.

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
  
  // 1. Generate a nonce from better-auth
  const { data: nonce } = await authClient.siwf.getNonce();

  // 2. Obtain a Farcaster JWT token on the client
  const result = await miniappSdk.quickAuth.getToken();
  if (!result || !result.token) {
    throw new Error("Failed to get token");
  }

  // 3. Verify and sign in with the Better Auth server
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

## Configuration Options

Server options accepted by `siwf`:

- `domain` (string, required): Domain expected in the Farcaster JWT. Must match exactly.
- `getNonce` (() => Promise<string>, required): Return a cryptographically secure random nonce. Nonces expire after 15 minutes.
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
| notificationDetails  | json    | Optional (MiniApp notification)     |
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

- Nonces are short-lived (15 minutes) and bound to `fid`.
- The server verifies Farcaster JWTs with the configured `domain`. Mismatched domains will fail.
- Session cookies are set with `secure: true`, `httpOnly: true`, and `sameSite: "none"` for MiniApp compatibility. Serve over HTTPS.
- The plugin @farcaster/quick-auth ensures the JWT `sub` (subject) matches the provided `fid` before issuing a session.

## Troubleshooting

- 401 Unauthorized with message "Invalid or expired nonce": Ensure you mint a fresh nonce per sign-in attempt and call verify within 15 minutes.
- 401 "Invalid Farcaster user": The JWT subject must equal the provided `fid`.
- No session cookie set: In embedded contexts (MiniApps), ensure third-party cookies are allowed and your server uses HTTPS with `SameSite: none`.
- Domain mismatch: The JWT must be issued for the same `domain` configured in the plugin.

## Acknowledgements

- Structure and schema patterns inspired by the official Better Auth SIWE plugin: [SIWE Plugin Docs](https://www.better-auth.com/docs/plugins/siwe)
- Community exploration for Farcaster auth flows: [Community Farcaster Auth Plugin](https://github.com/iamlotp/Farcaster-Auth-Plugin-Better-Auth-/blob/master/README.md)
