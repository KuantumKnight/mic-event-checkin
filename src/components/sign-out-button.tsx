"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  async function signOut() {
    await createClient().auth.signOut();
    window.location.assign("/login");
  }

  return <button className="button button-quiet button-full" onClick={signOut}><LogOut size={15} /> Sign out</button>;
}
