"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import BottomNav from "./components/BottomNav";
import { useDragScroll } from "./hooks/useDragScroll";
import dynamic from "next/dynamic";

const UserQRCode = dynamic(() => import("./components/UserQRCode"), { ssr: false });

interface Promotion {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
}

interface Booking {
  id: string;
  classes: { date: string; time: string; class_name: string; coach_name: string };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function Home() {
  const [user, setUser] = useState<{ name: string; class_balance: number; classes_taken: number } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoIndex, setPromoIndex] = useState(0);
  const [qrOpen, setQrOpen] = useState(false);
  const dragScroll = useDragScroll();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, class_balance, classes_taken")
          .eq("id", data.user.id)
          .single();
        if (profile) setUser(profile);

        // Upcoming bookings
        const today = new Date().toISOString().split("T")[0];
        const { data: bks } = await supabase
          .from("bookings")
          .select("id, classes(date, time, class_name, coach_name)")
          .eq("user_id", data.user.id)
          .gte("classes.date", today)
          .order("classes(date)", { ascending: true })
          .limit(3);
        setUpcomingBookings((bks as unknown as Booking[])?.filter((b) => b.classes) || []);
      }

      // Promotions
      const { data: promos } = await supabase
        .from("updates")
        .select("id, title, body, image_url")
        .eq("category", "promotion")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      setPromotions((promos as Promotion[]) || []);

      setLoading(false);
    });
  }, []);

  // Handle promo scroll to detect current slide
  const handlePromoScroll = () => {
    const el = dragScroll.ref.current;
    if (!el) return;
    setPromoIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0ece6" }}>
      <p className="label" style={{ color: "#a8a29e" }}>Loading...</p>
    </div>
  );

  return (
    <main style={{ background: "#f0ece6", minHeight: "100vh", paddingBottom: "80px" }}>

      {/* Fullscreen QR modal */}
      {qrOpen && userId && (
        <div
          onClick={() => setQrOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "rgba(0,0,0,0.92)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <button
            onClick={() => setQrOpen(false)}
            style={{ position: "absolute", top: "48px", right: "24px", background: "none", border: "none", color: "white", fontSize: "1.8rem", cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
          <p style={{ color: "#a8a29e", fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "32px" }}>
            Check-in Code
          </p>
          <div style={{ background: "white", borderRadius: "20px", padding: "24px" }} onClick={(e) => e.stopPropagation()}>
            <UserQRCode userId={userId} />
          </div>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", marginTop: "28px" }}>Tap anywhere to close</p>
        </div>
      )}

      {/* Dark header */}
      <div style={{ background: "#1c1917", padding: "60px 24px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {user ? (
              <>
                <p style={{ color: "#a8a29e", fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
                  Welcome back
                </p>
                <h1 style={{ color: "white", fontSize: "2.2rem", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, lineHeight: 1.1 }}>
                  {user.name}!
                </h1>
              </>
            ) : (
              <h1 style={{ color: "white", fontSize: "2.5rem", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
                BRN LAB
              </h1>
            )}
          </div>
          {userId && (
            <button
              onClick={() => setQrOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", marginTop: "2px" }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity={0.75}>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="3" height="3" rx="0.5" />
                <rect x="19" y="14" width="2" height="2" rx="0.5" />
                <rect x="14" y="19" width="2" height="2" rx="0.5" />
                <rect x="18" y="19" width="3" height="2" rx="0.5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: "12px", padding: "0 16px", marginTop: "-1px", position: "relative", zIndex: 1 }}>
        {/* Classes completed */}
        <div style={{
          flex: 1, background: "white", borderRadius: "16px", padding: "20px 16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)", textAlign: "center",
        }}>
          <p style={{ fontSize: "2.8rem", fontWeight: 700, color: "#1c1917", lineHeight: 1 }}>
            {user?.classes_taken ?? 0}
          </p>
          <p style={{ fontSize: "0.78rem", color: "#78716c", fontWeight: 500, margin: "6px 0 10px" }}>
            Classes Completed
          </p>
          <Link href="/stats" style={{ fontSize: "0.75rem", color: "#8b6f47", textDecoration: "none", fontWeight: 500 }}>
            View Stats
          </Link>
        </div>

        {/* Balance / pass */}
        <div style={{
          flex: 1, background: "white", borderRadius: "16px", padding: "20px 16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)", textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          {user && (user.class_balance ?? 0) > 0 ? (
            <>
              <p style={{ fontSize: "2.8rem", fontWeight: 700, color: "#8b6f47", lineHeight: 1 }}>
                {user.class_balance}
              </p>
              <p style={{ fontSize: "0.78rem", color: "#78716c", fontWeight: 500, margin: "6px 0 10px" }}>
                Classes Left
              </p>
              <Link href="/classes" style={{ fontSize: "0.75rem", color: "#8b6f47", textDecoration: "none", fontWeight: 500 }}>
                Book a class
              </Link>
            </>
          ) : (
            <>
              <p style={{ fontSize: "0.88rem", color: "#1c1917", fontWeight: 600, lineHeight: 1.4, marginBottom: "10px" }}>
                A pass is needed to reserve
              </p>
              <Link href="/pricing" style={{ fontSize: "0.75rem", color: "#8b6f47", textDecoration: "none", fontWeight: 500 }}>
                Buy one now!
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Promotions carousel */}
      {promotions.length > 0 && (
        <div style={{ padding: "20px 16px 0" }}>
          <div
            ref={dragScroll.ref}
            onScroll={handlePromoScroll}
            className="swipe-x"
            style={{
              ...dragScroll.style,
              display: "flex",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              gap: "12px",
              borderRadius: "16px",
            }}
          >
            {promotions.map((promo) => (
              <div
                key={promo.id}
                style={{
                  minWidth: "100%",
                  scrollSnapAlign: "start",
                  background: "white",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  flexShrink: 0,
                }}
              >
                {promo.image_url && (
                  <div style={{
                    width: "100%", height: "180px",
                    backgroundImage: `url(${promo.image_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }} />
                )}
                <div style={{ padding: "20px" }}>
                  <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8b6f47", marginBottom: "8px" }}>
                    Promotion
                  </p>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1c1917", marginBottom: "8px" }}>
                    {promo.title}
                  </h3>
                  <p style={{ fontSize: "0.83rem", color: "#78716c", lineHeight: 1.6 }}>{promo.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          {promotions.length > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "10px" }}>
              {promotions.map((_, i) => (
                <div key={i} style={{
                  width: i === promoIndex ? "18px" : "6px",
                  height: "6px",
                  borderRadius: "100px",
                  background: i === promoIndex ? "#1c1917" : "#c9bfb3",
                  transition: "all 0.2s ease",
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Reservations */}
      <div style={{ padding: "24px 16px 0" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1c1917", marginBottom: "12px" }}>
          Upcoming Reservations
        </h2>

        {upcomingBookings.length === 0 ? (
          <div style={{
            background: "white", borderRadius: "16px", padding: "32px 20px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textAlign: "center",
          }}>
            {/* Calendar icon */}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c9bfb3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4" />
              <path d="M9 14l2 2 4-4" stroke="#8b6f47" strokeWidth="2" />
            </svg>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "#1c1917", marginBottom: "4px" }}>
              Book your place in one of our classes!
            </p>
            <p style={{ fontSize: "0.82rem", color: "#78716c", marginBottom: "20px" }}>
              No upcoming reservations
            </p>
            <Link href="/classes" style={{
              display: "block",
              background: "#8b6f47",
              color: "white",
              borderRadius: "12px",
              padding: "14px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "0.9rem",
              letterSpacing: "0.02em",
            }}>
              Book a Class
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {upcomingBookings.map((b) => (
              <Link key={b.id} href="/classes" style={{
                background: "white", borderRadius: "16px", padding: "16px 20px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textDecoration: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <p style={{ fontWeight: 700, color: "#1c1917", fontSize: "0.95rem" }}>{b.classes?.class_name}</p>
                  <p style={{ fontSize: "0.78rem", color: "#78716c", marginTop: "2px" }}>{b.classes?.coach_name}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1c1917" }}>{formatDate(b.classes?.date)}</p>
                  <p style={{ fontSize: "0.75rem", color: "#8b6f47", marginTop: "2px" }}>{formatTime(b.classes?.time)}</p>
                </div>
              </Link>
            ))}
            <Link href="/classes" style={{
              display: "block",
              background: "#8b6f47",
              color: "white",
              borderRadius: "12px",
              padding: "14px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "0.9rem",
              textAlign: "center",
              marginTop: "4px",
            }}>
              Book a Class
            </Link>
          </div>
        )}
      </div>

      {!user && (
        <div style={{ padding: "24px 16px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
          <Link href="/login" style={{
            display: "block", background: "#1c1917", color: "white",
            borderRadius: "12px", padding: "14px", textDecoration: "none",
            fontWeight: 700, fontSize: "0.9rem", textAlign: "center",
          }}>Sign In</Link>
          <Link href="/signup" style={{
            display: "block", background: "white", color: "#1c1917",
            borderRadius: "12px", padding: "14px", textDecoration: "none",
            fontWeight: 600, fontSize: "0.9rem", textAlign: "center",
            border: "1px solid #e2d9ce",
          }}>Create Account</Link>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
