import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const COOKIE_NAME = "itqaan_uid";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

/**
 * Get or create the current user from the itqaan_uid cookie.
 * Returns { userId, isNew } where isNew is true if a user was just created.
 * Sets the cookie if it doesn't exist.
 */
export async function getOrCreateUser() {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const existingToken = cookieStore.get(COOKIE_NAME)?.value;

  if (existingToken) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("anon_token", existingToken)
      .single();

    if (data) {
      return { userId: data.id, isNew: false };
    }
  }

  // No cookie or user not found — create new user
  const anonToken = crypto.randomUUID();
  const { data, error } = await supabase
    .from("users")
    .insert({ anon_token: anonToken })
    .select("id")
    .single();

  if (error) throw new Error("Failed to create user");

  cookieStore.set(COOKIE_NAME, anonToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return { userId: data.id, isNew: true };
}

/**
 * Look up a user by their Quran.com sub claim.
 * Returns the user row or null.
 */
export async function findUserByQfSub(qfSub) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, anon_token")
    .eq("qf_sub", qfSub)
    .single();
  return data;
}

/**
 * Link a Quran.com sub to an existing user row.
 */
export async function linkQfSub(userId, qfSub) {
  const supabase = await createClient();
  await supabase
    .from("users")
    .update({ qf_sub: qfSub })
    .eq("id", userId);
}
