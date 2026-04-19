"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "../../components/BottomNav";

const faqs = [
  { q: "How do I pay?", a: "All payments are made at the studio or via bank transfer. Once payment is confirmed by our team, your class balance will be updated in the app." },
  { q: "Can I share my classes with someone else?", a: "No. Class classes are personal and non-transferable." },
  { q: "What happens if I cancel late?", a: "Cancellations within 6 hours of the class start time incur a penalty. Repeated late cancellations may result in temporary suspension." },
  { q: "What if I arrive late?", a: "Arriving more than 3 minutes after class starts is considered a late arrival and may incur a penalty." },
  { q: "Do unused classes roll over?", a: "Package classes are valid for the period stated at purchase." },
  { q: "What do I need to bring?", a: "Grip socks are required for all classes. Appropriate pilates clothing must be worn." },
  { q: "Can I get a refund?", a: "Unused classes from packages are non-refundable. Please contact the studio for any exceptional circumstances." },
];

export default function FaqPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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
          FAQ
        </h1>
      </div>

      {/* Content */}
      <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {faqs.map((faq, i) => (
          <div key={i} style={{ background: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                width: "100%", display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "16px 18px",
                background: "transparent", border: "none", cursor: "pointer", textAlign: "left", gap: "12px",
              }}
            >
              <span style={{ fontSize: "0.88rem", fontWeight: 500, color: "#1c1917", lineHeight: 1.4 }}>{faq.q}</span>
              <span style={{
                color: "#a8a29e", fontSize: "1.1rem", flexShrink: 0,
                transform: openFaq === i ? "rotate(45deg)" : "none",
                transition: "transform 0.2s ease", display: "inline-block",
              }}>+</span>
            </button>
            {openFaq === i && (
              <div style={{ padding: "0 18px 16px", borderTop: "1px solid #f0ece6" }}>
                <p style={{ fontSize: "0.82rem", color: "#78716c", lineHeight: 1.6, paddingTop: "12px" }}>{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
