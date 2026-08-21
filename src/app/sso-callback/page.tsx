"use client";

import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

export default function SsoCallbackPage() {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const hasRun = useRef(false);

  async function finalizeSignIn() {
    await signIn.finalize({ navigate: ({ decorateUrl }) => { window.location.assign(decorateUrl("/")); } });
  }

  async function finalizeSignUp() {
    await signUp.finalize({ navigate: ({ decorateUrl }) => { window.location.assign(decorateUrl("/")); } });
  }

  useEffect(() => {
    if (!clerk.loaded || hasRun.current) return;
    hasRun.current = true;

    void (async () => {
      try {
        if (signIn.status === "complete") {
          await finalizeSignIn();
          return;
        }

        if (signUp.isTransferable) {
          await signIn.create({ transfer: true });
          if (signIn.status === "complete") await finalizeSignIn();
          else window.location.assign("/login");
          return;
        }

        if (signIn.isTransferable) {
          await signUp.create({ transfer: true });
          if (signUp.status === "complete") await finalizeSignUp();
          else window.location.assign("/login");
          return;
        }

        if (signUp.status === "complete") {
          await finalizeSignUp();
          return;
        }

        const sessionId = signIn.existingSession?.sessionId || signUp.existingSession?.sessionId;
        if (sessionId) {
          await clerk.setActive({
            session: sessionId,
            navigate: ({ decorateUrl }) => { window.location.assign(decorateUrl("/")); },
          });
          return;
        }

        window.location.assign("/login");
      } catch {
        window.location.assign("/login");
      }
    })();
  }, [clerk, signIn, signUp]);

  return <main className="auth-main"><div className="auth-card"><span className="eyebrow">Secure sign-in</span><h2>Finishing Google sign-in…</h2><p>Please wait while Clerk activates your MIC workspace.</p></div></main>;
}
