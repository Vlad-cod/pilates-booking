"use client";

import BottomNav from "../components/BottomNav";
import { useDragScroll } from "../hooks/useDragScroll";

const specialOffers = [
  { classes: 3, price: "0 ₫" },
  { classes: 5, price: "0 ₫" },
];

const packages = [
  { classes: 1,  price: "0 ₫" },
  { classes: 5,  price: "0 ₫" },
  { classes: 10, price: "0 ₫" },
  { classes: 15, price: "0 ₫" },
];

function PackageCard({ classes, price }: { classes: number; price: string }) {
  return (
    <div style={{
      minWidth: "160px",
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
      flexShrink: 0,
      background: "white",
    }}>
      {/* Gold band */}
      <div style={{ background: "#c4a355", padding: "8px 14px" }}>
        <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "white", opacity: 0.9 }}>
          BRN LAB
        </p>
      </div>
      {/* Black section */}
      <div style={{ background: "#1c1917", padding: "20px 14px", textAlign: "center" }}>
        <p style={{ color: "white", fontSize: "3rem", fontWeight: 800, lineHeight: 1 }}>{classes}</p>
        <p style={{ color: "#a8a29e", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "4px" }}>
          {classes === 1 ? "class" : "classes"}
        </p>
      </div>
      {/* White section */}
      <div style={{ padding: "14px", textAlign: "center" }}>
        <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1c1917" }}>{price}</p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const dragScroll = useDragScroll();

  return (
    <main style={{ background: "#f0ece6", minHeight: "100vh", paddingBottom: "80px" }}>

      {/* Dark header */}
      <div style={{ background: "#1c1917", padding: "60px 24px 28px" }}>
        <h1 style={{ color: "white", fontSize: "2rem", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
          Memberships &amp; Packages
        </h1>
        <p style={{ color: "#a8a29e", fontSize: "0.78rem", marginTop: "6px" }}>
          All payments are processed at the studio.
        </p>
      </div>

      <div style={{ padding: "24px 0 0" }}>

        {/* Special Offers */}
        <div style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "#1c1917", padding: "0 20px", marginBottom: "14px" }}>
            Special Offers
          </p>
          <div className="swipe-x" {...dragScroll} style={{
            ...dragScroll.style,
            display: "flex",
            gap: "12px",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            padding: "4px 20px 8px",
          }}>
            {specialOffers.map((pkg) => (
              <div key={pkg.classes} style={{ scrollSnapAlign: "start" }}>
                <PackageCard classes={pkg.classes} price={pkg.price} />
              </div>
            ))}
            {/* Peek spacer */}
            <div style={{ minWidth: "4px", flexShrink: 0 }} />
          </div>
        </div>

        {/* Packages */}
        <div style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "#1c1917", padding: "0 20px", marginBottom: "14px" }}>
            Packages
          </p>
          <div className="swipe-x" {...dragScroll} style={{
            ...dragScroll.style,
            display: "flex",
            gap: "12px",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            padding: "4px 20px 8px",
          }}>
            {packages.map((pkg) => (
              <div key={pkg.classes} style={{ scrollSnapAlign: "start" }}>
                <PackageCard classes={pkg.classes} price={pkg.price} />
              </div>
            ))}
            <div style={{ minWidth: "4px", flexShrink: 0 }} />
          </div>
        </div>

      </div>

      <BottomNav />
    </main>
  );
}
