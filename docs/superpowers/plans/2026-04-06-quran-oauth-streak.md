# Quran.com OAuth2 + Reading Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users connect their Quran.com account via OAuth2 and display their current reading streak in a persistent header.

**Architecture:** Next.js Route Handlers implement the OAuth2 Authorization Code + PKCE flow. Tokens are stored in httpOnly cookies. A client component in the root layout checks auth status and fetches streak data.

**Tech Stack:** Next.js 16 (App Router, Route Handlers), Web Crypto API (PKCE), Quran Foundation OAuth2 + User APIs

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `.env.local` | Modify | Add `NEXT_PUBLIC_BASE_URL`, `QF_SCOPES` |
| `src/lib/qf-auth.js` | Create | Shared PKCE helpers and cookie config constants |
| `src/app/api/auth/quran/route.js` | Create | Initiate OAuth2 flow |
| `src/app/api/auth/quran/callback/route.js` | Create | Handle OAuth2 callback, exchange code for tokens |
| `src/app/api/auth/quran/logout/route.js` | Create | Clear tokens and redirect through QF logout |
| `src/app/api/auth/quran/status/route.js` | Create | Return `{ connected: true/false }` |
| `src/app/api/streak/route.js` | Create | Proxy streak API with auth headers |
| `src/components/QuranAuthHeader.jsx` | Create | Client component: auth button / streak display |
| `src/app/layout.js` | Modify | Add `QuranAuthHeader` to body |

---

### Task 1: Environment Variables and Shared Auth Helpers

**Files:**
- Modify: `.env.local`
- Create: `src/lib/qf-auth.js`

- [ ] **Step 1: Add new env vars to `.env.local`**

Append to the end of `.env.local`:

```
NEXT_PUBLIC_BASE_URL=http://localhost:3000
QF_SCOPES=openid offline_access user
```

- [ ] **Step 2: Create `src/lib/qf-auth.js`**

This file contains PKCE helpers (using Web Crypto API available in Next.js edge/node runtime) and shared cookie config.

```js
// PKCE helpers for OAuth2 Authorization Code flow

function base64urlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

export async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64urlEncode(digest);
}

export function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

export function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

const isProduction = process.env.NODE_ENV === "production";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

export const TOKEN_COOKIE_NAMES = {
  accessToken: "qf_access_token",
  refreshToken: "qf_refresh_token",
  idToken: "qf_id_token",
  oauthState: "qf_oauth_state",
  codeVerifier: "qf_code_verifier",
};
```

- [ ] **Step 3: Commit**

```bash
git add .env.local src/lib/qf-auth.js
git commit -m "feat: add PKCE helpers and env vars for Quran.com OAuth2"
```

---

### Task 2: OAuth2 Authorize Route Handler

**Files:**
- Create: `src/app/api/auth/quran/route.js`

- [ ] **Step 1: Create the authorize route handler**

```js
import { cookies } from "next/headers";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generateNonce,
  COOKIE_OPTIONS,
  TOKEN_COOKIE_NAMES,
} from "@/lib/qf-auth";

export async function GET() {
  const authUrl = process.env.QF_AUTH_URL;
  const clientId = process.env.QF_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const scopes = process.env.QF_SCOPES;

  if (!authUrl || !clientId || !baseUrl || !scopes) {
    return Response.json(
      { error: "Missing OAuth2 configuration" },
      { status: 500 }
    );
  }

  const state = generateState();
  const nonce = generateNonce();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NAMES.oauthState, state, {
    ...COOKIE_OPTIONS,
    maxAge: 600, // 10 minutes
  });
  cookieStore.set(TOKEN_COOKIE_NAMES.codeVerifier, codeVerifier, {
    ...COOKIE_OPTIONS,
    maxAge: 600,
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/auth/quran/callback`,
    scope: scopes,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return Response.redirect(`${authUrl}/oauth2/auth?${params.toString()}`);
}
```

- [ ] **Step 2: Verify the route loads**

Run: `npx next build 2>&1 | tail -20` (or just start dev server and visit `/api/auth/quran` — it should redirect to QF's auth page, which will error since credentials aren't valid yet, but the redirect itself confirms the route works).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/quran/route.js
git commit -m "feat: add OAuth2 authorize route handler"
```

---

### Task 3: OAuth2 Callback Route Handler

**Files:**
- Create: `src/app/api/auth/quran/callback/route.js`

- [ ] **Step 1: Create the callback route handler**

```js
import { cookies } from "next/headers";
import { COOKIE_OPTIONS, TOKEN_COOKIE_NAMES } from "@/lib/qf-auth";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const cookieStore = await cookies();
  const savedState = cookieStore.get(TOKEN_COOKIE_NAMES.oauthState)?.value;
  const codeVerifier = cookieStore.get(TOKEN_COOKIE_NAMES.codeVerifier)?.value;

  // Validate state for CSRF protection
  if (!state || !savedState || state !== savedState) {
    return Response.redirect(`${baseUrl}/`);
  }

  if (!code || !codeVerifier) {
    return Response.redirect(`${baseUrl}/`);
  }

  // Exchange authorization code for tokens
  const authUrl = process.env.QF_AUTH_URL;
  const clientId = process.env.QF_CLIENT_ID;
  const clientSecret = process.env.QF_CLIENT_SECRET;

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: `${baseUrl}/api/auth/quran/callback`,
    code_verifier: codeVerifier,
  });

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  let tokenData;
  try {
    const tokenRes = await fetch(`${authUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      return Response.redirect(`${baseUrl}/`);
    }

    tokenData = await tokenRes.json();
  } catch {
    return Response.redirect(`${baseUrl}/`);
  }

  // Store tokens in httpOnly cookies
  const maxAge = tokenData.expires_in || 3600;

  cookieStore.set(TOKEN_COOKIE_NAMES.accessToken, tokenData.access_token, {
    ...COOKIE_OPTIONS,
    maxAge,
  });

  if (tokenData.refresh_token) {
    cookieStore.set(
      TOKEN_COOKIE_NAMES.refreshToken,
      tokenData.refresh_token,
      { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 } // 30 days
    );
  }

  if (tokenData.id_token) {
    cookieStore.set(TOKEN_COOKIE_NAMES.idToken, tokenData.id_token, {
      ...COOKIE_OPTIONS,
      maxAge,
    });
  }

  // Clear temporary PKCE cookies
  cookieStore.delete(TOKEN_COOKIE_NAMES.oauthState);
  cookieStore.delete(TOKEN_COOKIE_NAMES.codeVerifier);

  return Response.redirect(`${baseUrl}/`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/quran/callback/route.js
git commit -m "feat: add OAuth2 callback route handler with token exchange"
```

---

### Task 4: Logout and Status Route Handlers

**Files:**
- Create: `src/app/api/auth/quran/logout/route.js`
- Create: `src/app/api/auth/quran/status/route.js`

- [ ] **Step 1: Create the logout route handler**

```js
import { cookies } from "next/headers";
import { TOKEN_COOKIE_NAMES } from "@/lib/qf-auth";

export async function GET() {
  const cookieStore = await cookies();
  const idToken = cookieStore.get(TOKEN_COOKIE_NAMES.idToken)?.value;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const authUrl = process.env.QF_AUTH_URL;

  // Clear all QF cookies
  cookieStore.delete(TOKEN_COOKIE_NAMES.accessToken);
  cookieStore.delete(TOKEN_COOKIE_NAMES.refreshToken);
  cookieStore.delete(TOKEN_COOKIE_NAMES.idToken);

  // Redirect through QF logout if we have an id_token
  if (idToken && authUrl) {
    const params = new URLSearchParams({
      id_token_hint: idToken,
      post_logout_redirect_uri: baseUrl,
    });
    return Response.redirect(
      `${authUrl}/oauth2/sessions/logout?${params.toString()}`
    );
  }

  return Response.redirect(`${baseUrl}/`);
}
```

- [ ] **Step 2: Create the status route handler**

```js
import { cookies } from "next/headers";
import { TOKEN_COOKIE_NAMES } from "@/lib/qf-auth";

export async function GET() {
  const cookieStore = await cookies();
  const hasToken = cookieStore.has(TOKEN_COOKIE_NAMES.accessToken);
  return Response.json({ connected: hasToken });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/quran/logout/route.js src/app/api/auth/quran/status/route.js
git commit -m "feat: add OAuth2 logout and status route handlers"
```

---

### Task 5: Streak API Route Handler

**Files:**
- Create: `src/app/api/streak/route.js`

- [ ] **Step 1: Create the streak route handler**

```js
import { cookies } from "next/headers";
import { TOKEN_COOKIE_NAMES } from "@/lib/qf-auth";

export async function GET(request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(TOKEN_COOKIE_NAMES.accessToken)?.value;

  if (!accessToken) {
    return Response.json({ error: "not_authenticated" }, { status: 401 });
  }

  const baseUrl = process.env.QF_BASE_URL;
  const clientId = process.env.QF_CLIENT_ID;

  const headers = {
    "x-auth-token": accessToken,
    "x-client-id": clientId,
  };

  // Forward user timezone if available
  const timezone = request.headers.get("x-timezone");
  if (timezone) {
    headers["x-timezone"] = timezone;
  }

  try {
    const res = await fetch(`${baseUrl}/v1/streak/current?type=QURAN`, {
      headers,
    });

    if (!res.ok) {
      const status = res.status;
      if (status === 401) {
        return Response.json({ error: "token_expired" }, { status: 401 });
      }
      return Response.json({ error: "streak_unavailable" }, { status });
    }

    const data = await res.json();
    // API returns { success: true, data: [{ days: N }] }
    const days = data?.data?.[0]?.days ?? 0;
    return Response.json({ days });
  } catch {
    return Response.json({ error: "streak_unavailable" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/streak/route.js
git commit -m "feat: add streak API proxy route handler"
```

---

### Task 6: QuranAuthHeader Client Component

**Files:**
- Create: `src/components/QuranAuthHeader.jsx`

- [ ] **Step 1: Create the header component**

This is a client component that checks auth status on mount and displays either a connect button or streak info.

```jsx
"use client";

import { useState, useEffect } from "react";

export default function QuranAuthHeader() {
  const [connected, setConnected] = useState(false);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/quran/status");
        const data = await res.json();
        setConnected(data.connected);

        if (data.connected) {
          const streakRes = await fetch("/api/streak", {
            headers: { "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone },
          });

          if (streakRes.ok) {
            const streakData = await streakRes.json();
            setStreak(streakData.days);
          } else if (streakRes.status === 401) {
            setError("expired");
          } else {
            setError("unavailable");
          }
        }
      } catch {
        setError("unavailable");
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="w-full border-b border-border bg-surface px-4 py-2 text-center text-xs text-muted font-body">
        Loading...
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="w-full border-b border-border bg-surface px-4 py-2 text-center font-body">
        <a
          href="/api/auth/quran"
          className="text-xs text-emerald-700 underline underline-offset-2 hover:text-emerald-400 transition-colors"
        >
          Connect Quran.com
        </a>
      </div>
    );
  }

  return (
    <div className="w-full border-b border-border bg-surface px-4 py-2 font-body">
      <div className="mx-auto flex max-w-[680px] items-center justify-between">
        <span className="text-xs text-ink">
          {error === "expired" ? (
            <a
              href="/api/auth/quran"
              className="text-emerald-700 underline underline-offset-2"
            >
              Reconnect Quran.com
            </a>
          ) : error === "unavailable" ? (
            "Streak unavailable"
          ) : (
            <>
              <span className="font-display text-emerald-700">
                {streak ?? 0} day{streak !== 1 ? "s" : ""}
              </span>
              {" "}
              <span className="text-muted">— Quran.com Reading Streak</span>
            </>
          )}
        </span>
        <a
          href="/api/auth/quran/logout"
          className="text-xs text-muted hover:text-ink transition-colors"
        >
          Disconnect
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuranAuthHeader.jsx
git commit -m "feat: add QuranAuthHeader client component"
```

---

### Task 7: Integrate Header into Root Layout

**Files:**
- Modify: `src/app/layout.js`

- [ ] **Step 1: Add QuranAuthHeader to layout.js**

Add the import at the top of the file (after existing imports):

```js
import QuranAuthHeader from "@/components/QuranAuthHeader";
```

Replace the `<body>` tag content:

```jsx
<body className="min-h-full flex flex-col">
  <QuranAuthHeader />
  {children}
</body>
```

- [ ] **Step 2: Start dev server and verify**

Run: `npm run dev`

Visit `http://localhost:3000`. The header should appear showing "Connect Quran.com". Clicking it should redirect to the QF auth page (will error with invalid credentials, but confirms the flow).

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.js
git commit -m "feat: integrate QuranAuthHeader into root layout"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Env vars + shared PKCE helpers |
| 2 | OAuth2 authorize route (`/api/auth/quran`) |
| 3 | OAuth2 callback route (`/api/auth/quran/callback`) |
| 4 | Logout + status routes |
| 5 | Streak API proxy route (`/api/streak`) |
| 6 | `QuranAuthHeader` client component |
| 7 | Integrate header into root layout |

**Callback URL to register:** `http://localhost:3000/api/auth/quran/callback`
