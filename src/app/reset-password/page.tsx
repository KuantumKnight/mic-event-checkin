import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return <main className="auth-main"><div className="mobile-auth-brand"><Link href="/login"><BrandMark compact /></Link></div><ResetPasswordForm /></main>;
}
