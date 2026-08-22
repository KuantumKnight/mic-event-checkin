import { SignIn } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function LoginPage() {
  return <main className="auth-page">
    <div className="auth-side">
      <Link href="/" className="back-link"><ArrowLeft size={15} /> Back to overview</Link>
      <div className="auth-side-copy"><BrandMark /><span className="eyebrow light">A calmer check-in desk</span><h1>Make the room feel ready.</h1><p>MIC keeps the details quiet, so organizers can focus on the people in front of them.</p></div>
      <span className="auth-side-foot">MIC Development Department · 2026</span>
    </div>
    <div className="auth-main">
      <div className="mobile-auth-brand"><BrandMark compact /></div>
      <div className="clerk-auth-wrap">
        <span className="eyebrow">Organizer and attendee access</span>
        <SignIn
          path="/login"
          routing="path"
          fallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          appearance={{
            variables: {
              colorPrimary: "#687057",
              colorText: "#252825",
              colorTextSecondary: "#777c77",
              colorBackground: "#ffffff",
              borderRadius: "4px",
              fontFamily: "var(--font-geist), Arial, sans-serif",
            },
            elements: {
              card: "mic-clerk-card",
              headerTitle: "mic-clerk-title",
              headerSubtitle: "mic-clerk-subtitle",
              socialButtonsBlockButton: "mic-clerk-social",
              formButtonPrimary: "mic-clerk-primary",
              footerActionLink: "mic-clerk-link",
              identityPreviewEditButton: "mic-clerk-link",
            },
            options: {
              socialButtonsPlacement: "top",
              socialButtonsVariant: "blockButton",
            },
          }}
        />
      </div>
    </div>
  </main>;
}
