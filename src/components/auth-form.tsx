"use client";

import { ArrowRight, KeyRound, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useState } from "react";

type Flow = "normal" | "verify-signup" | "reset-request" | "reset-code" | "reset-password";

export function AuthForm() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [flow, setFlow] = useState<Flow>("normal");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");

  function showError(value: { message?: string } | null | undefined) {
    setMessageTone("error");
    setMessage(value?.message || "Authentication could not be completed.");
  }

  async function finalizeSignIn() {
    if (!signIn) return;
    await signIn.finalize({ navigate: ({ decorateUrl }) => { const url = decorateUrl("/"); window.location.href = url; } });
  }

  async function finalizeSignUp() {
    if (!signUp) return;
    await signUp.finalize({ navigate: ({ decorateUrl }) => { const url = decorateUrl("/"); window.location.href = url; } });
  }

  async function signInWithGoogle() {
    if (!signIn) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await signIn.sso({
        strategy: "oauth_google",
        redirectCallbackUrl: "/sso-callback",
        redirectUrl: "/",
      });
      if (result.error) showError(result.error);
    } catch (error) {
      showError(error as { message?: string });
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn || !signUp) return;
    setBusy(true);
    setMessage(null);
    setMessageTone("error");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const fullName = String(form.get("fullName") || "").trim();
    try {
      if (flow === "reset-request") {
        const created = await signIn.create({ identifier: email });
        if (created.error) return showError(created.error);
        const sent = await signIn.resetPasswordEmailCode.sendCode();
        if (sent.error) return showError(sent.error);
        setFlow("reset-code");
        setMessageTone("success");
        setMessage("A verification code is on its way to your email.");
        return;
      }
      if (flow === "reset-code") {
        const verified = await signIn.resetPasswordEmailCode.verifyCode({ code: String(form.get("code") || "").trim() });
        if (verified.error) return showError(verified.error);
        setFlow("reset-password");
        setMessageTone("success");
        setMessage("Code verified. Choose a new password.");
        return;
      }
      if (flow === "reset-password") {
        const updated = await signIn.resetPasswordEmailCode.submitPassword({ password });
        if (updated.error) return showError(updated.error);
        await finalizeSignIn();
        return;
      }
      if (flow === "verify-signup") {
        const verified = await signUp.verifications.verifyEmailCode({ code: String(form.get("code") || "").trim() });
        if (verified.error) return showError(verified.error);
        if (signUp.status === "complete") await finalizeSignUp();
        return;
      }
      if (mode === "signin") {
        const result = await signIn.password({ identifier: email, password });
        if (result.error) return showError(result.error);
        if (signIn.status === "complete") await finalizeSignIn();
        else showError({ message: "This account needs an additional verification step." });
        return;
      }
      const result = await signUp.password({ emailAddress: email, password, firstName: fullName });
      if (result.error) return showError(result.error);
      if (signUp.status === "complete") {
        await finalizeSignUp();
      } else {
        const sent = await signUp.verifications.sendEmailCode();
        if (sent.error) return showError(sent.error);
        setFlow("verify-signup");
        setMessageTone("success");
        setMessage("Account created. Check your email for the verification code.");
      }
    } catch (error) {
      showError(error as { message?: string });
    } finally {
      setBusy(false);
    }
  }

  const recovery = flow === "reset-request" || flow === "reset-code" || flow === "reset-password";
  const codeStep = flow === "verify-signup" || flow === "reset-code";
  return <div className="auth-card">
    {!recovery && flow !== "verify-signup" && <div className="auth-tabs"><button type="button" className={mode === "signin" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("signin"); setMessage(null); }}>Sign in</button><button type="button" className={mode === "signup" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("signup"); setMessage(null); }}>Create account</button></div>}
    {!recovery && flow === "normal" && <>
      <button type="button" className="button button-outline auth-google" onClick={() => void signInWithGoogle()} disabled={busy || !signIn}>
        <GoogleMark /> {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      <div className="auth-divider"><span>or use email</span></div>
    </>}
    <form className="auth-form" onSubmit={submit}>
      {recovery ? <><span className="eyebrow">Account recovery</span><h3>{flow === "reset-password" ? "Choose a new password." : "Reset your password."}</h3><p>{flow === "reset-request" ? "Enter your account email and we will send a secure code." : flow === "reset-code" ? "Enter the verification code from your email." : "Your new password protects the workspace from here on."}</p></> : flow === "verify-signup" ? <><span className="eyebrow">Verify your account</span><h3>One last step.</h3><p>Enter the code sent to your email to activate your MIC account.</p></> : mode === "signup" && <label>Full name<input name="fullName" autoComplete="name" required placeholder="Your name" /></label>}
      {!codeStep && flow !== "reset-password" && <label><span>Email</span><div className="input-with-icon"><Mail size={16} /><input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div></label>}
      {codeStep && <label>Verification code<input name="code" inputMode="numeric" autoComplete="one-time-code" required placeholder="123456" /></label>}
      {(flow === "normal" || flow === "reset-password") && <label><span>{flow === "reset-password" ? "New password" : "Password"}</span><div className="input-with-icon"><LockKeyhole size={16} /><input name="password" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} required placeholder="8+ characters" /></div></label>}
      {!recovery && flow === "normal" && mode === "signin" && <button type="button" className="text-link auth-forgot" onClick={() => { setFlow("reset-request"); setMessage(null); }}>Forgot password?</button>}
      {message && <p className={messageTone === "success" ? "auth-message auth-success" : "auth-message"}>{message}</p>}
      <button className="button button-primary auth-submit" disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : flow === "reset-password" ? <KeyRound size={16} /> : <ArrowRight size={16} />}{flow === "verify-signup" ? "Verify email" : flow === "reset-request" ? "Send reset code" : flow === "reset-code" ? "Verify code" : flow === "reset-password" ? "Update password" : mode === "signin" ? "Enter workspace" : "Create account"}</button>
      {(recovery || flow === "verify-signup") && <button type="button" className="button button-quiet" onClick={() => { setMode("signin"); setFlow("normal"); setMessage(null); }}>Back to sign in</button>}
    </form>
    <p className="auth-note">Authentication is managed by Clerk. MIC keeps event ownership and attendance records in Supabase.</p>
  </div>;
}

function GoogleMark() {
  return <svg aria-hidden="true" className="google-mark" viewBox="0 0 18 18" role="img"><path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.909c1.703-1.568 2.683-3.878 2.683-6.615Z" /><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.258c-.806.54-1.835.86-3.047.86-2.344 0-4.33-1.584-5.04-3.714H.953v2.332A9 9 0 0 0 9 18Z" /><path fill="#FBBC05" d="M3.96 10.708A5.41 5.41 0 0 1 3.676 9c0-.593.102-1.17.284-1.708V4.96H.953A9 9 0 0 0 0 9c0 1.453.348 2.827.953 4.04l3.007-2.332Z" /><path fill="#EA4335" d="M9 3.578c1.322 0 2.508.454 3.442 1.344l2.582-2.582C13.463.89 11.426 0 9 0A9 9 0 0 0 .953 4.96L3.96 7.292C4.67 5.162 6.656 3.578 9 3.578Z" /></svg>;
}
