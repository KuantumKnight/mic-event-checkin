import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const profile = await getProfile();
  redirect(profile?.role === "attendee" ? "/events" : profile ? "/dashboard" : "/login");
}
