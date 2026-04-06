# Quran.com OAuth2 + Reading Streak Integration

## Overview

Add a persistent header bar across all pages that allows users to connect their Quran.com account via OAuth2 and view their current reading streak.

## States

- **Disconnected**: Shows a "Connect Quran.com" button
- **Connected**: Shows current reading streak (e.g., "12 days - Quran.com Reading Streak") with a disconnect option

## OAuth2 Flow

Implements Authorization Code flow with PKCE against the Quran Foundation OAuth2 server.

### Route Handlers

1. **`GET /api/auth/quran`** - Initiates OAuth2 flow
   - Generates `state` (CSRF), `nonce`, `code_verifier`, `code_challenge` (S256)
   - Stores `state` and `code_verifier` in httpOnly cookies for callback validation
   - Redirects to `https://oauth2.quran.foundation/oauth2/auth` with params:
     - `response_type=code`
     - `client_id`
     - `redirect_uri=<BASE_URL>/api/auth/quran/callback`
     - `scope=openid offline_access user`
     - `state`, `nonce`, `code_challenge`, `code_challenge_method=S256`

2. **`GET /api/auth/quran/callback`** - Handles OAuth2 callback
   - Validates `state` parameter against cookie
   - Exchanges authorization code for tokens at `https://oauth2.quran.foundation/oauth2/token`
     - Sends `grant_type=authorization_code`, `code`, `redirect_uri`, `code_verifier`
     - Uses HTTP Basic auth with `client_id:client_secret`
   - Stores `access_token`, `refresh_token`, `id_token` in separate httpOnly cookies
   - Clears PKCE cookies
   - Redirects to `/`

3. **`GET /api/auth/quran/logout`** - Disconnects account
   - Clears all QF token cookies
   - Redirects through QF logout endpoint: `https://oauth2.quran.foundation/oauth2/sessions/logout` with `id_token_hint` and `post_logout_redirect_uri`

4. **`GET /api/auth/quran/status`** - Returns auth status
   - Checks if `qf_access_token` cookie exists
   - Returns `{ connected: true/false }`

### Session Storage

All tokens stored as httpOnly, secure (in production), sameSite=lax cookies:
- `qf_access_token` - Access token for API calls
- `qf_refresh_token` - Refresh token for renewal
- `qf_id_token` - ID token for logout
- `qf_oauth_state` - Temporary, for CSRF validation during auth flow
- `qf_code_verifier` - Temporary, for PKCE during auth flow

## Streak API

### Route Handler

**`GET /api/streak`** - Fetches current streak
- Reads `qf_access_token` from cookies
- Calls `GET https://apis.quran.foundation/v1/streak/current?type=QURAN`
  - Headers: `x-auth-token: <access_token>`, `x-client-id: <QF_CLIENT_ID>`
  - Optional header: `x-timezone` from request
- Returns `{ days: number }` on success
- Returns `{ error: "not_authenticated" }` if no token

## Components

### `QuranAuthHeader` (Client Component)

Located in `src/components/QuranAuthHeader.jsx`. Added to root `layout.js`.

- On mount: fetches `/api/auth/quran/status`
- If disconnected: renders "Connect Quran.com" link pointing to `/api/auth/quran`
- If connected: fetches `/api/streak`, displays streak count and label, shows disconnect button
- Styled as a slim bar at the top of the page, consistent with the app's existing design

## Environment Variables

Existing (in `.env.local`):
- `QF_CLIENT_ID` - OAuth2 client ID
- `QF_CLIENT_SECRET` - OAuth2 client secret
- `QF_AUTH_URL` - `https://oauth2.quran.foundation`
- `QF_BASE_URL` - `https://apis.quran.foundation`

New additions:
- `NEXT_PUBLIC_BASE_URL` - App base URL (`http://localhost:3000` for dev)
- `QF_SCOPES` - `openid offline_access user`

## Callback URL

Register with Quran Foundation: `http://localhost:3000/api/auth/quran/callback`

(For production: `https://<production-domain>/api/auth/quran/callback`)

## Error Handling

- Token exchange failure: redirect to `/` with no cookies set
- Streak API failure (401): show "Reconnect" prompt (token may be expired)
- Streak API failure (other): show "Streak unavailable" text
- Missing env vars: route handlers return 500 with generic error
