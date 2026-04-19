"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "../components/BottomNav";
import { useDragScroll } from "../hooks/useDragScroll";

interface ClassSlot {
  id: string;
  date: string;
  time: string;
  class_name: string;
  coach_name: string;
  capacity: number;
  booking_count: number;
  waitlist_count: number;
  user_booked: boolean;
  user_waitlisted: boolean;
  booking_status: string | null;
}

const MAX_BOOKING_DAYS = 14; // can't book more than 2 weeks ahead

function get14Days() {
  const today = new Date();
  return Array.from({ length: MAX_BOOKING_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function isBookingAllowed(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diffDays = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= MAX_BOOKING_DAYS;
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return {
    day: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    num: d.getDate(),
  };
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

function CoachAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: "52px", height: "52px", borderRadius: "50%",
      background: "#e8e0d6", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "0.8rem", fontWeight: 700, color: "#8b6f47",
    }}>
      {initials}
    </div>
  );
}

export default function ClassesPage() {
  const [slots, setSlots] = useState<ClassSlot[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragScroll = useDragScroll();
  const router = useRouter();
  const weekDays = get14Days();

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDay(today);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUserId(data.user.id);

      const { data: profile } = await supabase.from("profiles").select("class_balance").eq("id", data.user.id).single();
      if (profile) setBalance(profile.class_balance ?? 0);

      const { data: classes } = await supabase
        .from("classes")
        .select("id, date, time, class_name, coach_name, capacity")
        .in("date", get14Days())
        .order("date").order("time");

      const { data: myBookings } = await supabase.from("bookings").select("class_id, status").eq("user_id", data.user.id);
      const { data: allBookings } = await supabase.from("bookings").select("class_id");
      const { data: myWaitlist } = await supabase.from("waitlist").select("class_id").eq("user_id", data.user.id);
      const { data: allWaitlist } = await supabase.from("waitlist").select("class_id");

      const myBookingMap: Record<string, string> = {};
      myBookings?.forEach((b) => { myBookingMap[b.class_id] = b.status; });
      const myWaitlistIds = new Set(myWaitlist?.map((w) => w.class_id) || []);
      const bookingCountMap: Record<string, number> = {};
      const waitlistCountMap: Record<string, number> = {};
      allBookings?.forEach((b) => { bookingCountMap[b.class_id] = (bookingCountMap[b.class_id] || 0) + 1; });
      allWaitlist?.forEach((w) => { waitlistCountMap[w.class_id] = (waitlistCountMap[w.class_id] || 0) + 1; });

      const enriched = (classes || []).map((c) => ({
        ...c,
        booking_count: bookingCountMap[c.id] || 0,
        waitlist_count: waitlistCountMap[c.id] || 0,
        user_booked: !!myBookingMap[c.id],
        user_waitlisted: myWaitlistIds.has(c.id),
        booking_status: myBookingMap[c.id] || null,
      }));

      setSlots(enriched);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const book = async (slot: ClassSlot) => {
    if (!isBookingAllowed(slot.date)) { alert("You can only book classes up to 2 weeks in advance."); return; }
    if (balance <= 0) { alert("No classes remaining. Please contact the studio to top up your balance."); return; }
    setActionId(slot.id);
    const supabase = createClient();
    await supabase.from("bookings").insert({ user_id: userId, class_id: slot.id, status: "confirmed" });
    await supabase.from("profiles").update({ class_balance: balance - 1 }).eq("id", userId);
    setBalance((b) => b - 1);
    setSlots((prev) => prev.map((s) => s.id === slot.id
      ? { ...s, user_booked: true, booking_count: s.booking_count + 1, booking_status: "confirmed" } : s));
    setActionId(null);
  };

  const cancel = async (slot: ClassSlot) => {
    setActionId(slot.id);
    const supabase = createClient();
    await supabase.from("bookings").delete().eq("user_id", userId).eq("class_id", slot.id);
    if (slot.waitlist_count > 0) {
      const { data: first } = await supabase.from("waitlist").select("user_id").eq("class_id", slot.id).order("joined_at").limit(1).single();
      if (first) {
        const { data: wp } = await supabase.from("profiles").select("class_balance").eq("id", first.user_id).single();
        if (wp && wp.class_balance > 0) {
          await supabase.from("bookings").insert({ user_id: first.user_id, class_id: slot.id, status: "confirmed" });
          await supabase.from("profiles").update({ class_balance: wp.class_balance - 1 }).eq("id", first.user_id);
          await supabase.from("waitlist").delete().eq("user_id", first.user_id).eq("class_id", slot.id);
          await supabase.from("profiles").update({ class_balance: balance + 1 }).eq("id", userId);
          setBalance((b) => b + 1);
          setSlots((prev) => prev.map((s) => s.id === slot.id ? { ...s, user_booked: false, booking_status: null, waitlist_count: s.waitlist_count - 1 } : s));
          setActionId(null);
          return;
        }
      }
    }
    await supabase.from("profiles").update({ class_balance: balance + 1 }).eq("id", userId);
    setBalance((b) => b + 1);
    setSlots((prev) => prev.map((s) => s.id === slot.id ? { ...s, user_booked: false, booking_status: null, booking_count: s.booking_count - 1 } : s));
    setActionId(null);
  };

  const joinWaitlist = async (slot: ClassSlot) => {
    setActionId(slot.id);
    const supabase = createClient();
    await supabase.from("waitlist").insert({ user_id: userId, class_id: slot.id });
    setSlots((prev) => prev.map((s) => s.id === slot.id ? { ...s, user_waitlisted: true, waitlist_count: s.waitlist_count + 1 } : s));
    setActionId(null);
  };

  const leaveWaitlist = async (slot: ClassSlot) => {
    setActionId(slot.id);
    const supabase = createClient();
    await supabase.from("waitlist").delete().eq("user_id", userId).eq("class_id", slot.id);
    setSlots((prev) => prev.map((s) => s.id === slot.id ? { ...s, user_waitlisted: false, waitlist_count: s.waitlist_count - 1 } : s));
    setActionId(null);
  };

  const todaySlots = slots.filter((s) => s.date === selectedDay);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0ece6" }}>
      <p style={{ color: "#a8a29e", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  return (
    <main style={{ background: "#f0ece6", minHeight: "100vh", paddingBottom: "80px" }}>

      {/* Dark header */}
      <div style={{ background: "#1c1917", padding: "52px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 style={{ color: "white", fontSize: "1.6rem", fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, letterSpacing: "0.05em" }}>
            BRN LAB
          </h1>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "#a8a29e", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Balance</p>
            <p style={{ color: "#c4a355", fontSize: "1.1rem", fontWeight: 700 }}>{balance}</p>
          </div>
        </div>

        {/* Day selector */}
        <div
          ref={scrollRef}
          className="swipe-x"
          {...dragScroll}
          style={{
            ...dragScroll.style,
            display: "flex",
            gap: "0",
            overflowX: "auto",
            scrollbarWidth: "none",
            borderBottom: "1px solid #333",
          }}
        >
          {weekDays.map((date) => {
            const { day, num } = formatDayLabel(date);
            const isSelected = date === selectedDay;
            const hasClasses = slots.some((s) => s.date === date);
            return (
              <button
                key={date}
                onClick={() => setSelectedDay(date)}
                style={{
                  flexShrink: 0,
                  minWidth: "44px",
                  padding: "8px 4px 12px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderBottom: isSelected ? "2px solid #c4a355" : "2px solid transparent",
                  marginBottom: "-1px",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <p style={{ fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.08em", color: isSelected ? "#c4a355" : "#666" }}>{day}</p>
                <p style={{ fontSize: "1.15rem", fontWeight: isSelected ? 700 : 400, color: isSelected ? "white" : "#888", lineHeight: 1 }}>{num}</p>
                {hasClasses && (
                  <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: isSelected ? "#c4a355" : "#555" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current day label */}
      {selectedDay && (
        <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid #e2d9ce" }}>
          <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1c1917" }}>{formatFullDate(selectedDay)}</p>
        </div>
      )}

      {/* Class list */}
      <div style={{ background: "white" }}>
        {todaySlots.length === 0 ? (
          <div style={{ padding: "64px 32px", textAlign: "center", background: "white" }}>
            <div style={{
              width: "52px", height: "52px", borderRadius: "50%",
              background: "#f0ece6", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 16px",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c4a355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M3 9h18M8 2v4M16 2v4" />
              </svg>
            </div>
            <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1c1917", marginBottom: "6px" }}>
              No classes today
            </p>
            <p style={{ fontSize: "0.78rem", color: "#a8a29e", lineHeight: 1.5 }}>
              No classes are scheduled for this day.{"\n"}Try another date.
            </p>
          </div>
        ) : (
          todaySlots.map((slot, i) => {
            const full = slot.booking_count >= slot.capacity && !slot.user_booked;
            const bookingAllowed = isBookingAllowed(slot.date);
            return (
              <div key={slot.id}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px" }}>
                  {/* Time */}
                  <div style={{ minWidth: "44px", flexShrink: 0 }}>
                    <p style={{ fontSize: "1rem", fontWeight: 700, color: "#1c1917", lineHeight: 1 }}>{formatTime(slot.time)}</p>
                  </div>

                  {/* Coach avatar */}
                  <CoachAvatar name={slot.coach_name} />

                  {/* Info — links to detail */}
                  <Link href={`/classes/${slot.id}`} style={{ flex: 1, textDecoration: "none", minWidth: 0 }}>
                    <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1c1917", marginBottom: "2px" }}>{slot.class_name}</p>
                    <p style={{ fontSize: "0.78rem", color: "#78716c" }}>{slot.coach_name}</p>
                    {slot.user_booked && (
                      <p style={{ fontSize: "0.68rem", color: "#3d7a5a", fontWeight: 600, marginTop: "3px", letterSpacing: "0.04em" }}>✓ Booked</p>
                    )}
                    {slot.user_waitlisted && (
                      <p style={{ fontSize: "0.68rem", color: "#8b6f47", fontWeight: 600, marginTop: "3px" }}>Waitlisted</p>
                    )}
                  </Link>

                  {/* Action button */}
                  <div style={{ flexShrink: 0 }}>
                    {slot.user_booked ? (
                      <button
                        onClick={() => cancel(slot)}
                        disabled={actionId === slot.id}
                        style={{
                          padding: "8px 14px", borderRadius: "8px",
                          border: "1.5px solid #b84040", background: "transparent",
                          color: "#b84040", fontSize: "0.72rem", fontWeight: 600,
                          cursor: "pointer", letterSpacing: "0.04em",
                        }}
                      >
                        {actionId === slot.id ? "..." : "Cancel"}
                      </button>
                    ) : slot.user_waitlisted ? (
                      <button
                        onClick={() => leaveWaitlist(slot)}
                        disabled={actionId === slot.id}
                        style={{
                          padding: "8px 14px", borderRadius: "8px",
                          border: "1.5px solid #c9bfb3", background: "transparent",
                          color: "#78716c", fontSize: "0.72rem", fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {actionId === slot.id ? "..." : "Leave"}
                      </button>
                    ) : full ? (
                      <button
                        onClick={() => joinWaitlist(slot)}
                        disabled={actionId === slot.id}
                        style={{
                          padding: "8px 14px", borderRadius: "8px",
                          border: "1.5px solid #c9bfb3", background: "transparent",
                          color: "#78716c", fontSize: "0.72rem", fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        {actionId === slot.id ? "..." : "Waitlist Only"}
                      </button>
                    ) : (
                      <button
                        onClick={() => book(slot)}
                        disabled={actionId === slot.id || balance <= 0 || !bookingAllowed}
                        style={{
                          padding: "8px 18px", borderRadius: "8px",
                          border: `1.5px solid ${!bookingAllowed ? "#c9bfb3" : "#c4a355"}`,
                          background: "transparent",
                          color: !bookingAllowed ? "#a8a29e" : "#1c1917",
                          fontSize: "0.72rem", fontWeight: 700,
                          cursor: (!bookingAllowed || balance <= 0) ? "not-allowed" : "pointer",
                          opacity: (!bookingAllowed || balance <= 0) ? 0.5 : 1,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {actionId === slot.id ? "..." : !bookingAllowed ? "Not Yet Open" : "Reserve"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Divider */}
                {i < todaySlots.length - 1 && (
                  <div style={{ height: "1px", background: "#f0ece6", margin: "0 20px" }} />
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </main>
  );
}
