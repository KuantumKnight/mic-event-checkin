"use client";

import { ArrowRight, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setMessageTone("error");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password") || "");
    const fullName = String(form.get("fullName") || "");
    const supabase = createClient();
    if (forgot) {
      const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
      setBusy(false); if (result.error) setMessage(result.error.message); else { setMessageTone("success"); setMessage("If that account exists, a reset link is on its way."); } return;
    }
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });

    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessageTone("success");
      setMessage("Account created. Check your email to confirm it, then come back here.");
      return;
    }
    window.location.assign("/");
  }

  return <div className="auth-card">{!forgot && <div className="auth-tabs"><button type="button" className={mode === "signin" ? "auth-tab active" : "auth-tab"} onClick={() => setMode("signin")}>Sign in</button><button type="button" className={mode === "signup" ? "auth-tab active" : "auth-tab"} onClick={() => setMode("signup")}>Create account</button></div>}<form className="auth-form" onSubmit={submit}>{forgot ? <><span className="eyebrow">Account recovery</span><h3>Reset your password.</h3><p>Enter your account email and we will send a secure reset link.</p></> : mode === "signup" && <label>Full name<input name="fullName" autoComplete="name" required placeholder="Your name" /></label>}<label><span>Email</span><div className="input-with-icon"><Mail size={16} /><input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div></label>{!forgot && <label><span>Password</span><div className="input-with-icon"><LockKeyhole size={16} /><input name="password" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required placeholder="8+ characters" /></div></label>}{!forgot && mode === "signin" && <button type="button" className="text-link auth-forgot" onClick={() => { setForgot(true); setMessage(null); }}>Forgot password?</button>}{message && <p className={messageTone === "success" ? "auth-message auth-success" : "auth-message"}>{message}</p>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}{forgot ? "Send reset link" : mode === "signin" ? "Enter workspace" : "Create account"}</button>{forgot && <button type="button" className="button button-quiet" onClick={() => { setForgot(false); setMessage(null); }}>Back to sign in</button>}</form><p className="auth-note">Your role and access are enforced by Supabase policies, not just the interface.</p></div>;
}
