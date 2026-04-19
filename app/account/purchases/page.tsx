"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import BottomNav from "../../components/BottomNav";

interface Purchase {
  id: string;
  created_at: string;
  classes_added: number;
  notes: string | null;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }

      const { data: p } = await supabase
        .from("purchases")
        .select("id, created_at, classes_added, notes")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });

      setPurchases((p as Purchase[]) || []);
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
          Purchases
        </h1>
      </div>

      {/* Content */}
      {purchases.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "#1a1a1a" }}>No purchases made.</p>
        </div>
      ) : (
        <div style={{ padding: "20px 20px 32px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {purchases.map((p) => (
            <div key={p.id} style={{ background: "white", borderRadius: "14px", padding: "16px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1c1917" }}>+{p.classes_added} {p.classes_added === 1 ? "class" : "classes"}</p>
                {p.notes && <p style={{ fontSize: "0.75rem", color: "#78716c", marginTop: "2px" }}>{p.notes}</p>}
              </div>
              <p style={{ fontSize: "0.78rem", color: "#a8a29e" }}>
                {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
