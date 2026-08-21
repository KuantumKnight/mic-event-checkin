"use client";

import { Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function QrScanner({ onScan }: { onScan: (token: string) => void }) {
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const [status, setStatus] = useState("Starting camera…");

  useEffect(() => {
    let active = true;
    async function start() {
      const module = await import("html5-qrcode");
      const scanner = new module.Html5Qrcode("mic-qr-reader");
      scannerRef.current = scanner;
      try {
        await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } }, (decodedText) => {
          if (!active) return;
          setStatus("QR captured. Validating…");
          onScan(decodedText);
        }, () => undefined);
        setStatus("Point the camera at an attendee QR code");
      } catch {
        setStatus("Camera unavailable. Use the retry button or simulate a scan.");
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
