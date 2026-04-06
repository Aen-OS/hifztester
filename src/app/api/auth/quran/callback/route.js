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
