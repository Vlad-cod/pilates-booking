"use client";

import { useRouter } from "next/navigation";
import BottomNav from "../../components/BottomNav";

const policies = [
  { icon: "⏱", title: "Late Cancellation", text: "Cancel at least 6 hours before class to avoid a penalty." },
  { icon: "🕐", title: "Late Arrival", text: "Arriving 3+ minutes late counts as a late arrival and may incur a penalty." },
  { icon: "🧦", title: "Grip Socks", text: "Required for all classes. Available at the studio." },
  { icon: "👗", title: "Dress Code", text: "Appropriate pilates clothing must be worn." },
];

export default function PoliciesPage() {
  const router = useRouter();

  return (
    <main style={{ background: "#f0ece6", minHeight: "100vh", paddingBottom: "80px" }}>

      {/* Dark header */}
      <div style={{ background: "#1c1917", padding: "52px 24px 28px" }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "white", fontSize: "1.3rem", cursor: "pointer", padding: 0, marginBottom: "12px", display: "block" }}
        >
          ‹
        </button>
        <h1 style={{ color: "white", fontSize: "2rem", fontWeight: 700, lineHeight: 1.1, fontFamily: "inherit" }}>
          Studio Policies
        </h1>
      </div>

      {/* Content */}
      <div style={{ padding: "28px 24px" }}>
        <div style={{ background: "white", borderRadius: "16px", padding: "8px 0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {policies.map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: "14px",
              padding: "18px 20px",
              borderBottom: i < policies.length - 1 ? "1px solid #f0ece6" : "none",
            }}>
              <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{p.icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1c1917", marginBottom: "4px" }}>{p.title}</p>
                <p style={{ fontSize: "0.82rem", color: "#78716c", lineHeight: 1.6 }}>{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
