import { cookies } from "next/headers";
import {
  TOKEN_COOKIE_NAMES,
  COOKIE_OPTIONS,
  refreshAccessToken,
} from "@/lib/qf-auth";

async function fetchStreak(accessToken, request) {
  const baseUrl = process.env.QF_BASE_URL;
  const clientId = process.env.QF_CLIENT_ID;

  const headers = {
    "x-auth-token": accessToken,
    "x-client-id": clientId,
  };

  const timezone = request.headers.get("x-timezone");
  if (timezone) {
    headers["x-timezone"] = timezone;
  }

  return fetch(`${baseUrl}/auth/v1/streak/current?type=QURAN`, {
    headers,
  });
}

export async function GET(request) {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get(TOKEN_COOKIE_NAMES.accessToken)?.value;

  if (!accessToken) {
    return Response.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    let res = await fetchStreak(accessToken, request);

    // If token expired, try refreshing
    if (res.status === 401) {
      const storedRefresh = cookieStore.get(
        TOKEN_COOKIE_NAMES.refreshToken
      )?.value;
      const tokenData = await refreshAccessToken(storedRefresh);

      if (tokenData?.access_token) {
        // Update cookies with new tokens
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

        // Retry with new token
        accessToken = tokenData.access_token;
        res = await fetchStreak(accessToken, request);
      }
    }

    if (!res.ok) {
      if (res.status === 401) {
        return Response.json({ error: "token_expired" }, { status: 401 });
      }
      return Response.json({ error: "streak_unavailable" }, { status: res.status });
    }

    const data = await res.json();
    const days = data?.data?.[0]?.days ?? 0;
    return Response.json({ days });
  } catch {
    return Response.json({ error: "streak_unavailable" }, { status: 502 });
  }
}
