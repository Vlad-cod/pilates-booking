"use client";

import { useEffect, useRef } from "react";

interface Props {
  onScan: (text: string) => void;
  active: boolean;
}

export default function QRScanner({ onScan, active }: Props) {
  const scannerRef = useRef<any>(null);
  const divId = "qr-scanner-container";

  useEffect(() => {
    if (!active) return;

    let stopped = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped) return;
      const scanner = new Html5Qrcode(divId);
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text: string) => {
          onScan(text);
        },
        undefined
      ).catch((err: unknown) => {
        console.error("Scanner start error:", err);
      });
    });

    return () => {
      stopped = true;
      if (scannerRef.current) {
        scannerRef.current.stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [active, onScan]);

  if (!active) return null;

  return (
    <div style={{ width: "100%", borderRadius: "16px", overflow: "hidden" }}>
      <div id={divId} style={{ width: "100%" }} />
    </div>
  );
}
