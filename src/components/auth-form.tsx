"use client";

import { ArrowRight, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const fullName = String(form.get("fullName") || "");
    const supabase = createClient();
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });

    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to confirm it, then come back here.");
      return;
    }
    window.location.assign("/");
  }

  return <div className="auth-card"><div className="auth-tabs"><button className={mode === "signin" ? "auth-tab active" : "auth-tab"} onClick={() => setMode("signin")}>Sign in</button><button className={mode === "signup" ? "auth-tab active" : "auth-tab"} onClick={() => setMode("signup")}>Create account</button></div><form className="auth-form" onSubmit={submit}>{mode === "signup" && <label>Full name<input name="fullName" autoComplete="name" required placeholder="Your name" /></label>}<label><span>Email</span><div className="input-with-icon"><Mail size={16} /><input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div></label><label><span>Password</span><div className="input-with-icon"><LockKeyhole size={16} /><input name="password" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required placeholder="8+ characters" /></div></label>{message && <p className="auth-message">{message}</p>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}{mode === "signin" ? "Enter workspace" : "Create account"}</button></form><p className="auth-note">Your role and access are enforced by Supabase policies, not just the interface.</p></div>;
}
