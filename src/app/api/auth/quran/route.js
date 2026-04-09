import { NextResponse } from "next/server";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generateNonce,
  COOKIE_OPTIONS,
  TOKEN_COOKIE_NAMES,
} from "@/lib/qf-auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const authUrl = process.env.QF_AUTH_URL;
  const clientId = process.env.QF_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const scopes = process.env.QF_SCOPES;

  if (!authUrl || !clientId || !baseUrl || !scopes) {
    console.error("[auth/quran] Missing config:", { authUrl: !!authUrl, clientId: !!clientId, baseUrl: !!baseUrl, scopes: !!scopes });
    return NextResponse.json(
      { error: "Missing OAuth2 configuration" },
      { status: 500 }
    );
  }

  const state = generateState();
  const nonce = generateNonce();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

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

  const redirectUrl = `${authUrl}/oauth2/auth?${params.toString()}`;
  console.log("[auth/quran] Redirecting to:", redirectUrl);

  const response = NextResponse.redirect(redirectUrl, { status: 307 });

  response.cookies.set(TOKEN_COOKIE_NAMES.oauthState, state, {
    ...COOKIE_OPTIONS,
    maxAge: 600,
  });
  response.cookies.set(TOKEN_COOKIE_NAMES.codeVerifier, codeVerifier, {
    ...COOKIE_OPTIONS,
    maxAge: 600,
  });

  return response;
}
