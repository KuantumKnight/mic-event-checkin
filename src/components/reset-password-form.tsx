"use client";

import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null); const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setMessage(null); const password = String(new FormData(event.currentTarget).get("password")); const result = await createClient().auth.updateUser({ password }); setBusy(false); if (result.error) setMessage(result.error.message); else { setDone(true); setMessage("Password updated. You can enter the workspace now."); } }
  return <form className="auth-card auth-form" onSubmit={submit}><span className="eyebrow">Account recovery</span><h2>Choose a new password.</h2><label>New password<div className="input-with-icon"><KeyRound size={16} /><input name="password" type="password" minLength={8} required placeholder="8+ characters" /></div></label>{message && <p className={done ? "form-success" : "auth-message"}>{message}</p>}{done ? <a className="button button-primary auth-submit" href="/">Enter workspace <ArrowRight size={16} /></a> : <button className="button button-primary auth-submit" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />} Update password</button>}</form>;
}
