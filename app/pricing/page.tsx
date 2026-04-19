"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import BottomNav from "../components/BottomNav";
import { useDragScroll } from "../hooks/useDragScroll";

interface Package {
  id: string;
  name: string | null;
  classes: number;
  price: string;
  type: string;
  sort_order: number;
}

function PackageCard({ pkg }: { pkg: Package }) {
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
          {pkg.name || "BRN LAB"}
        </p>
      </div>
      {/* Black section */}
      <div style={{ background: "#1c1917", padding: "20px 14px", textAlign: "center" }}>
        <p style={{ color: "white", fontSize: "3rem", fontWeight: 800, lineHeight: 1 }}>{pkg.classes}</p>
        <p style={{ color: "#a8a29e", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "4px" }}>
          {pkg.classes === 1 ? "class" : "classes"}
        </p>
      </div>
      {/* White section */}
      <div style={{ padding: "14px", textAlign: "center" }}>
        <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1c1917" }}>{pkg.price}</p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [specialOffers, setSpecialOffers] = useState<Package[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const dragScrollOffers = useDragScroll();
  const dragScrollPackages = useDragScroll();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("packages")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        const all = (data as Package[]) || [];
        setSpecialOffers(all.filter((p) => p.type === "special_offer"));
        setPackages(all.filter((p) => p.type === "package"));
        setLoading(false);
      });
  }, []);

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

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
          <p style={{ color: "#a8a29e", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading...</p>
        </div>
      ) : (
        <div style={{ padding: "24px 0 0" }}>

          {/* Special Offers */}
          {specialOffers.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <p style={{ fontSize: "1rem", fontWeight: 700, color: "#1c1917", padding: "0 20px", marginBottom: "14px" }}>
                Special Offers
              </p>
              <div ref={dragScrollOffers.ref} className="swipe-x" style={{
                ...dragScrollOffers.style,
                display: "flex",
                gap: "12px",
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                scrollbarWidth: "none",
                padding: "4px 20px 8px",
              }}>
                {specialOffers.map((pkg) => (
                  <div key={pkg.id} style={{ scrollSnapAlign: "start" }}>
                    <PackageCard pkg={pkg} />
                  </div>
                ))}
                <div style={{ minWidth: "4px", flexShrink: 0 }} />
              </div>
            </div>
          )}

          {/* Packages */}
          {packages.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <p style={{ fontSize: "1rem", fontWeight: 700, color: "#1c1917", padding: "0 20px", marginBottom: "14px" }}>
                Packages
              </p>
              <div ref={dragScrollPackages.ref} className="swipe-x" style={{
                ...dragScrollPackages.style,
                display: "flex",
                gap: "12px",
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                scrollbarWidth: "none",
                padding: "4px 20px 8px",
              }}>
                {packages.map((pkg) => (
                  <div key={pkg.id} style={{ scrollSnapAlign: "start" }}>
                    <PackageCard pkg={pkg} />
                  </div>
                ))}
                <div style={{ minWidth: "4px", flexShrink: 0 }} />
              </div>
            </div>
          )}

        </div>
      )}

      <BottomNav />
    </main>
  );
}
