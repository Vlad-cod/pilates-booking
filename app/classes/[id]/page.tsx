"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";

interface ClassDetail {
  id: string;
  date: string;
  time: string;
  class_name: string;
  coach_name: string;
  capacity: number;
  description: string | null;
}

interface Participant {
  user_id: string;
  profiles: { name: string };
}

interface WaitlistEntry {
  user_id: string;
  joined_at: string;
  profiles: { name: string };
}

function formatDateTime(dateStr: string, time: string) {
  const d = new Date(dateStr + "T12:00:00");
  const dateLabel = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const [h, m] = time.split(":").map(Number);
  const timeLabel = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return `${dateLabel} at ${timeLabel}`;
}

function CoachAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: "52px", height: "52px", borderRadius: "50%",
      background: "#e8e0d6", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "0.85rem", fontWeight: 700, color: "#8b6f47",
    }}>
      {initials}
    </div>
  );
}

export default function ClassDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [userBooked, setUserBooked] = useState(false);
  const [userWaitlisted, setUserWaitlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  const load = async () => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/login"); return; }
    setUserId(auth.user.id);

    const { data: profile } = await supabase.from("profiles").select("class_balance").eq("id", auth.user.id).single();
    if (profile) setBalance(profile.class_balance ?? 0);

    const { data: classData } = await supabase.from("classes").select("id, date, time, class_name, coach_name, capacity, description").eq("id", id).single();
    if (classData) setCls(classData);

    const { data: bookings } = await supabase.from("bookings").select("user_id, profiles(name)").eq("class_id", id);
    setParticipants((bookings as unknown as Participant[]) || []);
    setUserBooked(bookings?.some((b) => b.user_id === auth.user.id) ?? false);

    const { data: wl } = await supabase.from("waitlist").select("user_id, joined_at, profiles(name)").eq("class_id", id).order("joined_at");
    setWaitlist((wl as unknown as WaitlistEntry[]) || []);
    setUserWaitlisted(wl?.some((w) => w.user_id === auth.user.id) ?? false);

    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const book = async () => {
    if (balance <= 0) { alert("No classes remaining. Please contact the studio."); return; }
    setActionLoading(true);
    const supabase = createClient();
    await supabase.from("bookings").insert({ user_id: userId, class_id: id, status: "confirmed" });
    await supabase.from("profiles").update({ class_balance: balance - 1 }).eq("id", userId);
    setBalance((b) => b - 1);
    await load();
    setActionLoading(false);
  };

  const cancel = async () => {
    setActionLoading(true);
    const supabase = createClient();
    await supabase.from("bookings").delete().eq("user_id", userId).eq("class_id", id);
    await supabase.from("profiles").update({ class_balance: balance + 1 }).eq("id", userId);
    setBalance((b) => b + 1);
    await load();
    setActionLoading(false);
  };

  const joinWaitlist = async () => {
    setActionLoading(true);
    const supabase = createClient();
    await supabase.from("waitlist").insert({ user_id: userId, class_id: id });
    await load();
    setActionLoading(false);
  };

  const leaveWaitlist = async () => {
    setActionLoading(true);
    const supabase = createClient();
    await supabase.from("waitlist").delete().eq("user_id", userId).eq("class_id", id);
    await load();
    setActionLoading(false);
  };

  if (loading || !cls) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0ece6" }}>
      <p style={{ color: "#a8a29e", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  const isFull = participants.length >= cls.capacity && !userBooked;

  return (
    <main style={{ background: "white", minHeight: "100vh", paddingBottom: "160px" }}>

      {/* Dark header */}
      <div style={{ background: "#1c1917", padding: "52px 24px 28px" }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "white", fontSize: "1.3rem", cursor: "pointer", padding: 0, marginBottom: "14px", display: "block" }}
        >
          ‹
        </button>
        <h1 style={{ color: "white", fontSize: "2rem", fontWeight: 700, lineHeight: 1.1, fontFamily: "inherit" }}>
          Class Details
        </h1>
      </div>

      {/* Body */}
      <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: "0" }}>

        {/* Class info */}
        <div style={{ paddingBottom: "24px", borderBottom: "1px solid #f0f0f0" }}>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "6px" }}>{cls.class_name}</h2>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>{formatDateTime(cls.date, cls.time)}</p>
          <p style={{ fontSize: "0.88rem", color: "#78716c", marginBottom: "4px" }}>{cls.coach_name}</p>
          <p style={{ fontSize: "0.88rem", color: "#78716c" }}>50 min.</p>
        </div>

        {/* Coach */}
        <div style={{ paddingTop: "24px", paddingBottom: "24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: "16px" }}>
          <CoachAvatar name={cls.coach_name} />
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a1a" }}>{cls.coach_name}</p>
        </div>

        {/* Class Description */}
        <div style={{ paddingTop: "24px" }}>
          <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "12px" }}>Class Description</p>
          <p style={{ fontSize: "0.88rem", color: "#78716c", lineHeight: 1.75, marginBottom: "16px" }}>
            Dial in on your core, lower body, and upper body - one muscle group at a time - in this signature low impact, high intensity workout designed to tone from head to toe. All levels welcome.
          </p>
          <p style={{ fontSize: "0.88rem", color: "#78716c", lineHeight: 1.75 }}>
            Grip socks are required for all classes.
          </p>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "390px", padding: "16px 24px 32px", background: "white", borderTop: "1px solid #f0f0f0" }}>
        {userBooked ? (
          <>
            <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#3d7a5a", fontWeight: 600, marginBottom: "10px" }}>✓ You are booked for this class</p>
            <button onClick={cancel} disabled={actionLoading} style={{ width: "100%", padding: "16px", background: "transparent", border: "1.5px solid #b84040", borderRadius: "10px", color: "#b84040", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>
              {actionLoading ? "Cancelling..." : "Cancel Booking"}
            </button>
          </>
        ) : userWaitlisted ? (
          <>
            <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#78716c", marginBottom: "10px" }}>You are on the waitlist</p>
            <button onClick={leaveWaitlist} disabled={actionLoading} style={{ width: "100%", padding: "16px", background: "transparent", border: "1.5px solid #c9bfb3", borderRadius: "10px", color: "#78716c", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>
              {actionLoading ? "Leaving..." : "Leave Waitlist"}
            </button>
          </>
        ) : isFull ? (
          <button onClick={joinWaitlist} disabled={actionLoading} style={{ width: "100%", padding: "16px", background: "#c4a355", border: "none", borderRadius: "10px", color: "white", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>
            {actionLoading ? "..." : "Join Waitlist"}
          </button>
        ) : (
          <button onClick={book} disabled={actionLoading || balance <= 0} style={{ width: "100%", padding: "16px", background: balance <= 0 ? "#c9bfb3" : "#c4a355", border: "none", borderRadius: "10px", color: "white", fontSize: "1rem", fontWeight: 700, cursor: balance <= 0 ? "not-allowed" : "pointer" }}>
            {actionLoading ? "Booking..." : balance <= 0 ? "No Balance — Contact Studio" : "Book"}
          </button>
        )}
      </div>
    </main>
  );
}
