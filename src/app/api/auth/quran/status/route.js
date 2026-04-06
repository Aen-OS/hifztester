import { cookies } from "next/headers";
import { TOKEN_COOKIE_NAMES } from "@/lib/qf-auth";

export async function GET() {
  const cookieStore = await cookies();
  const hasToken = cookieStore.has(TOKEN_COOKIE_NAMES.accessToken);
  return Response.json({ connected: hasToken });
}
