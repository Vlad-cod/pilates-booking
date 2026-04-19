"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "../components/BottomNav";

export default function AccountPage() {
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("name, is_admin").eq("id", data.user.id).single();
      if (prof) { setName(prof.name); setIsAdmin(prof.is_admin); }
      setLoading(false);
    });
  }, [router]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0ece6" }}>
      <p style={{ color: "#a8a29e", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  const menuItems = [
    { label: "Reservation History", href: "/stats" },
    { label: "Purchases", href: "/account/purchases" },
    { label: "Memberships & Classes", href: "/account/memberships" },
    { label: "Personal Information", href: "/account/profile" },
    { label: "Studio Policies", href: "/account/policies" },
    { label: "FAQ", href: "/account/faq" },
    ...(isAdmin ? [{ label: "Admin Dashboard", href: "/admin" }] : []),
  ];

  return (
    <main style={{ background: "#f0ece6", minHeight: "100vh", paddingBottom: "80px" }}>

      {/* Dark header */}
      <div style={{ background: "#1c1917", padding: "60px 24px 28px" }}>
        <h1 style={{ color: "white", fontSize: "2.4rem", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, lineHeight: 1 }}>
          {name}
        </h1>
      </div>

      {/* Menu list */}
      <div style={{ background: "white" }}>
        {menuItems.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "18px 24px",
              borderBottom: i < menuItems.length - 1 ? "1px solid #f0ece6" : "none",
              textDecoration: "none", background: "white",
            }}
          >
            <span style={{ fontSize: "0.95rem", color: "#1a1a1a", fontWeight: 400 }}>{item.label}</span>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="#c9bfb3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 1l6 6-6 6" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Log Out */}
      <div style={{ padding: "32px 24px" }}>
        <button
          onClick={signOut}
          style={{
            width: "100%", padding: "16px",
            background: "#c4a355", border: "none",
            borderRadius: "10px", color: "white",
            fontSize: "1rem", fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Log Out
        </button>
      </div>

      <BottomNav />
    </main>
  );
}
