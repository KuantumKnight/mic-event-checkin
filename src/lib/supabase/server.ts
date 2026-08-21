import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase server credentials are not configured.");
  return createSupabaseClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function createClient() {
  return getAdminClient();
}

async function getClerkIdentity() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!email) throw new Error("Your Clerk account needs a verified email address.");
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || email.split("@")[0];
  return { clerkUserId: userId, email, fullName };
}

export async function getProfile() {
  const identity = await getClerkIdentity();
  if (!identity) return null;

  const supabase = getAdminClient();
  const existing = await supabase.from("profiles").select("id, full_name, role, email, clerk_user_id").eq("clerk_user_id", identity.clerkUserId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw users.error;
  let shadowUser = users.data.users.find((user) => user.email?.trim().toLowerCase() === identity.email);
  if (!shadowUser) {
    const created = await supabase.auth.admin.createUser({ email: identity.email, email_confirm: true, password: `${randomUUID()}-ShadowOnly`, user_metadata: { full_name: identity.fullName } });
    if (created.error || !created.data.user) throw created.error || new Error("Could not create the linked database profile.");
    shadowUser = created.data.user;
  }

  const linked = await supabase.from("profiles").upsert({ id: shadowUser.id, clerk_user_id: identity.clerkUserId, email: identity.email, full_name: identity.fullName }, { onConflict: "id" }).select("id, full_name, role, email, clerk_user_id").single();
  if (linked.error) throw linked.error;
  return linked.data;
}

export async function getClaims() {
  const profile = await getProfile();
  return profile ? { sub: profile.id, email: profile.email } : null;
}
