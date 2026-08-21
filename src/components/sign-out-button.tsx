"use client";

import { LogOut } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

export function SignOutButton() {
  const { signOut } = useClerk();
  async function handleSignOut() {
    await signOut();
    window.location.assign("/login");
  }

  return <button className="button button-quiet button-full" onClick={() => void handleSignOut()}><LogOut size={15} /> Sign out</button>;
}
