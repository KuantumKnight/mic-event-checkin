import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";

export function ResetPasswordForm() {
  return <div className="auth-card auth-form"><span className="eyebrow">Account recovery</span><h2>Use Clerk recovery.</h2><p>Password resets are handled inside the secure Clerk sign-in flow.</p><Link className="button button-primary auth-submit" href="/login">Open sign in <KeyRound size={16} /><ArrowRight size={16} /></Link></div>;
}
