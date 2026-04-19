"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";

interface Booking {
  id: string;
  booked_at: string;
  checked_in: boolean;
  classes: { date: string; time: string; class_name: string; coach_name: string };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function StatsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }

      const { data: bks } = await supabase
        .from("bookings")
        .select("id, booked_at, checked_in, classes(date, time, class_name, coach_name)")
        .eq("user_id", data.user.id)
        .order("booked_at", { ascending: false });

      setBookings((bks as unknown as Booking[])?.filter((b) => b.classes) || []);
      setLoading(false);
    });
  }, [router]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0ece6" }}>
      <p style={{ color: "#a8a29e", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  const today = new Date().toISOString().split("T")[0];
  const upcoming = bookings.filter((b) => b.classes?.date >= today);
  const past = bookings.filter((b) => b.classes?.date < today);

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
          Reservation History
        </h1>
      </div>

      {/* Content */}
      {bookings.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "#1a1a1a" }}>No classes completed.</p>
        </div>
      ) : (
        <div style={{ padding: "20px 20px 32px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {upcoming.length > 0 && (
            <div>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a8a29e", marginBottom: "10px" }}>Upcoming</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {upcoming.map((b) => (
                  <div key={b.id} style={{ background: "white", borderRadius: "14px", padding: "14px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1c1917" }}>{b.classes?.class_name}</p>
                      <p style={{ fontSize: "0.75rem", color: "#78716c", marginTop: "2px" }}>{b.classes?.coach_name}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1c1917" }}>{formatDate(b.classes?.date)}</p>
                      <p style={{ fontSize: "0.72rem", color: "#8b6f47", marginTop: "2px" }}>{formatTime(b.classes?.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a8a29e", marginBottom: "10px" }}>Past</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {past.map((b) => (
                  <div key={b.id} style={{ background: "white", borderRadius: "14px", padding: "14px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.7 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1c1917" }}>{b.classes?.class_name}</p>
                        {b.checked_in && (
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#3d7a5a", border: "1px solid #3d7a5a", borderRadius: "100px", padding: "1px 6px", letterSpacing: "0.06em" }}>Attended</span>
                        )}
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "#78716c", marginTop: "2px" }}>{b.classes?.coach_name}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1c1917" }}>{formatDate(b.classes?.date)}</p>
                      <p style={{ fontSize: "0.72rem", color: "#8b6f47", marginTop: "2px" }}>{formatTime(b.classes?.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
