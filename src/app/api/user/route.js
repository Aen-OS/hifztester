import { getOrCreateUser } from "@/lib/user-identity";

export async function GET() {
  try {
    const { userId, isNew } = await getOrCreateUser();
    return Response.json({ user_id: userId, is_new: isNew });
  } catch {
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
