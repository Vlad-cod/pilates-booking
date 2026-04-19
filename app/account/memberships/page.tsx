"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "../../components/BottomNav";

export default function MembershipsPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      const { data: prof } = await supabase
        .from("profiles")
        .select("class_balance")
        .eq("id", data.user.id)
        .single();
      if (prof) setBalance(prof.class_balance ?? 0);
      setLoading(false);
    });
  }, [router]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0ece6" }}>
      <p style={{ color: "#a8a29e", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

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
          Memberships &amp; Classes
        </h1>
      </div>

      {/* Content */}
      <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Memberships */}
        <div>
          <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>Memberships</p>
          <p style={{ fontSize: "0.92rem", color: "#1a1a1a", lineHeight: 1.5 }}>
            You currently don&apos;t have any memberships associated with your account.
          </p>
        </div>

        {/* Classes */}
        <div>
          <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>Classes</p>
          {balance && balance > 0 ? (
            <p style={{ fontSize: "0.92rem", color: "#1a1a1a", lineHeight: 1.5 }}>
              You have <strong>{balance}</strong> {balance === 1 ? "class" : "classes"} remaining.
            </p>
          ) : (
            <p style={{ fontSize: "0.92rem", color: "#1a1a1a", lineHeight: 1.5 }}>
              You currently don&apos;t have any classes associated with your account.
            </p>
          )}
        </div>

        {/* Buy More button */}
        <Link
          href="/pricing"
          style={{
            display: "block", textAlign: "center",
            width: "100%", padding: "16px",
            background: "#c4a355", border: "none",
            borderRadius: "10px", color: "white",
            fontSize: "1rem", fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Buy More
        </Link>
      </div>

      <BottomNav />
    </main>
  );
}
