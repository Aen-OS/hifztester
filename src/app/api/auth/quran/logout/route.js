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
