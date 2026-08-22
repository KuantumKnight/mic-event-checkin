import { SignIn } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function LoginPage() {
  return <main className="auth-page">
    <div className="auth-side">
      <Link href="/" className="back-link"><ArrowLeft size={15} /> Back to overview</Link>
      <div className="auth-side-copy"><BrandMark /><span className="eyebrow light">Event access</span><h1>Manage arrivals with confidence.</h1><p>Sign in to create events, issue attendee passes, and run the check-in desk.</p></div>
      <span className="auth-side-foot">MIC Event Check-in</span>
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
              logoImageUrl: "/mic-logo.webp",
              logoLinkUrl: "/",
              logoPlacement: "outside",
              socialButtonsPlacement: "top",
              socialButtonsVariant: "blockButton",
            },
          }}
        />
      </div>
    </div>
  </main>;
}
