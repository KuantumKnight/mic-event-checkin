"use client";

import { Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function QrScanner({ onScan }: { onScan: (token: string) => Promise<void> }) {
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const scanLockRef = useRef(false);
  const lastTokenRef = useRef({ token: "", at: 0 });
  const [status, setStatus] = useState("Starting camera…");

  useEffect(() => {
    let active = true;
    async function start() {
      const module = await import("html5-qrcode");
      const scanner = new module.Html5Qrcode("mic-qr-reader");
      scannerRef.current = scanner;
      try {
        await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } }, async (decodedText) => {
          if (!active) return;
          const now = Date.now();
          if (scanLockRef.current || (decodedText === lastTokenRef.current.token && now - lastTokenRef.current.at < 1500)) return;
          scanLockRef.current = true;
          lastTokenRef.current = { token: decodedText, at: now };
          setStatus("QR captured. Validating…");
          try { await onScan(decodedText); } finally { scanLockRef.current = false; if (active) setStatus("Point the camera at an attendee QR code"); }
        }, () => undefined);
        setStatus("Point the camera at an attendee QR code");
      } catch {
        setStatus("Camera unavailable. Use manual attendee lookup.");
      }
    }
    void start();
    return () => {
      active = false;
      if (scannerRef.current) void scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => undefined);
    };
  }, [onScan]);

  return <div className="camera-reader"><div id="mic-qr-reader" /><div className="camera-status">{status === "Starting camera…" ? <Loader2 size={14} className="spin" /> : <Camera size={14} />}{status}</div></div>;
}
