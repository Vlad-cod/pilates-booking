"use client";

import { QRCodeSVG } from "qrcode.react";

export default function UserQRCode({ userId }: { userId: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0 20px" }}>
      <p style={{ fontSize: "0.68rem", color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "18px" }}>
        Your Check-in Code
      </p>
      <div style={{
        padding: "18px",
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "1px solid #f0ece6",
      }}>
        <QRCodeSVG
          value={userId}
          size={190}
          bgColor="white"
          fgColor="#1c1917"
          level="M"
        />
      </div>
      <p style={{ fontSize: "0.75rem", color: "#c9bfb3", marginTop: "14px" }}>
        Show this to your instructor to check in
      </p>
    </div>
  );
}
