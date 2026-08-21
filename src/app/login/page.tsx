import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { BrandMark } from "@/components/brand-mark";

export default function LoginPage() {
  return <main className="auth-page"><div className="auth-side"><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to overview</Link><div className="auth-side-copy"><BrandMark /><span className="eyebrow light">A calmer check-in desk</span><h1>Make the room feel ready.</h1><p>MIC keeps the details quiet, so organizers can focus on the people in front of them.</p></div><span className="auth-side-foot">MIC Development Department · 2026</span></div><div className="auth-main"><div className="mobile-auth-brand"><BrandMark compact /></div><div className="auth-heading"><span className="eyebrow">Organizer and attendee access</span><h2>Welcome back.</h2><p>Sign in to your MIC workspace.</p></div><AuthForm /></div></main>;
}
