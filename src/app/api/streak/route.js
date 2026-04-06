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
