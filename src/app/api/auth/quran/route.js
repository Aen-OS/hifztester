import { cookies } from "next/headers";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generateNonce,
  COOKIE_OPTIONS,
  TOKEN_COOKIE_NAMES,
} from "@/lib/qf-auth";

export const dynamic = "force-dynamic";

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
    maxAge: 600,
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

  const redirectUrl = `${authUrl}/oauth2/auth?${params.toString()}`;

  return new Response(null, {
    status: 307,
    headers: { Location: redirectUrl },
  });
}
