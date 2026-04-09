import { cookies } from "next/headers";
import {
  TOKEN_COOKIE_NAMES,
  COOKIE_OPTIONS,
  refreshAccessToken,
} from "@/lib/qf-auth";

export async function GET() {
  const cookieStore = await cookies();
  const hasAccessToken = cookieStore.has(TOKEN_COOKIE_NAMES.accessToken);

  if (hasAccessToken) {
    return Response.json({ connected: true });
  }

  // Access token missing — try refreshing before declaring disconnected
  const storedRefresh = cookieStore.get(
    TOKEN_COOKIE_NAMES.refreshToken
  )?.value;

  if (storedRefresh) {
    const tokenData = await refreshAccessToken(storedRefresh);
    if (tokenData?.access_token) {
      const maxAge = tokenData.expires_in || 3600;
      cookieStore.set(
        TOKEN_COOKIE_NAMES.accessToken,
        tokenData.access_token,
        { ...COOKIE_OPTIONS, maxAge }
      );
      if (tokenData.refresh_token) {
        cookieStore.set(
          TOKEN_COOKIE_NAMES.refreshToken,
          tokenData.refresh_token,
          { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 }
        );
      }
      return Response.json({ connected: true });
    }
  }

  return Response.json({ connected: false });
}
