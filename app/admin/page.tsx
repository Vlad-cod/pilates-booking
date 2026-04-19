"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const QRScanner = dynamic(() => import("../components/QRScanner"), { ssr: false });

interface Member {
  id: string;
  name: string;
  email: string;
  class_balance: number;
  classes_taken: number;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
}

interface ClassSlot {
  id: string;
  date: string;
  time: string;
  class_name: string;
  coach_name: string;
  capacity: number;
  bookings: { user_id: string; checked_in: boolean; profiles: { name: string } }[];
  waitlist: { user_id: string; joined_at: string; profiles: { name: string } }[];
}

interface Penalty {
  id: string;
  type: "late_cancel" | "late_arrival";
  created_at: string;
  notes: string | null;
  profiles: { name: string };
  classes: { date: string; time: string; class_name: string };
}

interface Update {
  id: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  created_at: string;
}

function getWeekDays(offset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

const CATEGORIES = ["announcement", "coach", "promotion", "holiday", "schedule"];
const CATEGORY_LABELS: Record<string, string> = {
  announcement: "Announcement", coach: "New Coach", promotion: "Promotion",
  holiday: "Holiday Schedule", schedule: "Schedule Change",
};

const s = {
  card: {
    background: "white",
    borderRadius: "14px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    overflow: "hidden" as const,
  },
  label: {
    fontSize: "0.62rem" as const,
    fontWeight: 700 as const,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "#a8a29e",
  },
  sectionTitle: {
    fontSize: "0.95rem" as const,
    fontWeight: 700 as const,
    color: "#1c1917",
  },
  input: {
    width: "100%",
    border: "1px solid #e2d9ce",
    borderRadius: "10px",
    padding: "11px 14px",
    fontSize: "0.88rem",
    color: "#1c1917",
    background: "#faf7f4",
    outline: "none",
    fontFamily: "inherit",
  } as React.CSSProperties,
  btnPrimary: {
    background: "#1c1917",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "12px 20px",
    fontSize: "0.78rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.04em",
  } as React.CSSProperties,
  btnOutline: {
    background: "transparent",
    color: "#1c1917",
    border: "1.5px solid #1c1917",
    borderRadius: "10px",
    padding: "11px 20px",
    fontSize: "0.78rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.04em",
  } as React.CSSProperties,
  btnGhost: {
    background: "none",
    border: "none",
    color: "#8b6f47",
    fontSize: "0.72rem",
    fontWeight: 600,
    cursor: "pointer",
    padding: "0",
  } as React.CSSProperties,
  btnDanger: {
    background: "none",
    border: "none",
    color: "#b84040",
    fontSize: "0.72rem",
    fontWeight: 600,
    cursor: "pointer",
    padding: "0",
  } as React.CSSProperties,
};

export default function AdminPage() {
  const [tab, setTab] = useState<"schedule" | "checkin" | "members" | "penalties" | "updates" | "scan">("schedule");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [weekOffset, setWeekOffset] = useState(0);
  const [classes, setClasses] = useState<ClassSlot[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [todayClasses, setTodayClasses] = useState<ClassSlot[]>([]);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("1");
  const [memberSearch, setMemberSearch] = useState("");

  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [addPenaltyOpen, setAddPenaltyOpen] = useState(false);
  const [penaltyForm, setPenaltyForm] = useState({ user_id: "", class_id: "", type: "late_cancel", notes: "" });

  const [updates, setUpdates] = useState<Update[]>([]);
  const [updateForm, setUpdateForm] = useState({ title: "", body: "", category: "announcement", pinned: false });
  const [updateImage, setUpdateImage] = useState<File | null>(null);
  const [updateImagePreview, setUpdateImagePreview] = useState<string | null>(null);
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const [scannerActive, setScannerActive] = useState(false);
  const [scannedUser, setScannedUser] = useState<Member | null>(null);
  const [scanError, setScanError] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", data.user.id).single();
      if (!prof?.is_admin) { router.push("/"); return; }
      setLoading(false);
      loadAll();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadAll = async () => {
    await Promise.all([loadClasses(0), loadTodayClasses(), loadMembers(), loadPenalties(), loadUpdates()]);
  };

  const loadClasses = async (offset: number) => {
    setLoadingClasses(true);
    const supabase = createClient();
    const days = getWeekDays(offset);
    const { data } = await supabase
      .from("classes")
      .select("id, date, time, class_name, coach_name, capacity, bookings(user_id, checked_in, profiles(name)), waitlist(user_id, joined_at, profiles(name))")
      .in("date", days).order("date").order("time");
    setClasses((data as unknown as ClassSlot[]) || []);
    setLoadingClasses(false);
  };

  const deleteClass = async (id: string) => {
    if (!confirm("Delete this class? All bookings will be removed.")) return;
    const supabase = createClient();
    await supabase.from("bookings").delete().eq("class_id", id);
    await supabase.from("waitlist").delete().eq("class_id", id);
    await supabase.from("classes").delete().eq("id", id);
    setClasses((prev) => prev.filter((c) => c.id !== id));
  };

  const generateNextWeek = async () => {
    if (!confirm("Generate next week's schedule from the template?")) return;
    const supabase = createClient();
    const { data: template } = await supabase.from("class_templates").select("*");
    if (!template || template.length === 0) { alert("No template found. Add classes to the template first."); return; }
    const nextWeek = getWeekDays(1);
    const dayMap: Record<number, string> = { 1: nextWeek[0], 2: nextWeek[1], 3: nextWeek[2], 4: nextWeek[3], 5: nextWeek[4], 6: nextWeek[5], 0: nextWeek[6] };
    const toInsert = template.map((t: { day_of_week: number; time: string; class_name: string; coach_name: string; capacity: number }) => ({
      date: dayMap[t.day_of_week], time: t.time, class_name: t.class_name, coach_name: t.coach_name, capacity: t.capacity || 8,
    }));
    await supabase.from("classes").insert(toInsert);
    alert("Next week's schedule generated.");
    loadClasses(weekOffset);
  };

  const loadTodayClasses = async () => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("classes")
      .select("id, date, time, class_name, coach_name, capacity, bookings(user_id, checked_in, profiles(name)), waitlist(user_id, joined_at, profiles(name))")
      .eq("date", today).order("time");
    setTodayClasses((data as unknown as ClassSlot[]) || []);
  };

  const toggleCheckIn = async (classId: string, userId: string, currentState: boolean) => {
    setCheckingIn(`${classId}-${userId}`);
    const supabase = createClient();
    await supabase.from("bookings").update({ checked_in: !currentState }).eq("class_id", classId).eq("user_id", userId);
    if (!currentState) {
      const { data: prof } = await supabase.from("profiles").select("classes_taken").eq("id", userId).single();
      if (prof) await supabase.from("profiles").update({ classes_taken: (prof.classes_taken || 0) + 1 }).eq("id", userId);
    } else {
      const { data: prof } = await supabase.from("profiles").select("classes_taken").eq("id", userId).single();
      if (prof && prof.classes_taken > 0) await supabase.from("profiles").update({ classes_taken: prof.classes_taken - 1 }).eq("id", userId);
    }
    await loadTodayClasses();
    setCheckingIn(null);
  };

  const markLateArrival = async (classId: string, userId: string) => {
    const supabase = createClient();
    await supabase.from("penalties").insert({ user_id: userId, class_id: classId, type: "late_arrival", notes: "Marked by admin during check-in" });
    alert("Late arrival penalty recorded.");
  };

  const loadMembers = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").order("name");
    setMembers((data as Member[]) || []);
  };

  const approveUser = async (id: string) => {
    const supabase = createClient();
    await supabase.from("profiles").update({ is_approved: true }).eq("id", id);
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, is_approved: true } : m));
  };

  const rejectUser = async (id: string) => {
    if (!confirm("Reject and delete this account request?")) return;
    const supabase = createClient();
    await supabase.from("profiles").delete().eq("id", id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const addBalance = async (memberId: string) => {
    const supabase = createClient();
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    const amount = parseInt(addAmount);
    const newBalance = member.class_balance + amount;
    await supabase.from("profiles").update({ class_balance: newBalance }).eq("id", memberId);
    await supabase.from("purchases").insert({ user_id: memberId, classes_added: amount });
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, class_balance: newBalance } : m));
    setAddingTo(null);
    setAddAmount("1");
  };

  const loadPenalties = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("penalties")
      .select("id, type, created_at, notes, profiles(name), classes(date, time, class_name)")
      .order("created_at", { ascending: false }).limit(50);
    setPenalties((data as unknown as Penalty[]) || []);
  };

  const addPenalty = async () => {
    const supabase = createClient();
    await supabase.from("penalties").insert({ user_id: penaltyForm.user_id, class_id: penaltyForm.class_id || null, type: penaltyForm.type, notes: penaltyForm.notes || null });
    setPenaltyForm({ user_id: "", class_id: "", type: "late_cancel", notes: "" });
    setAddPenaltyOpen(false);
    loadPenalties();
  };

  const deletePenalty = async (id: string) => {
    const supabase = createClient();
    await supabase.from("penalties").delete().eq("id", id);
    setPenalties((prev) => prev.filter((p) => p.id !== id));
  };

  const loadUpdates = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("updates").select("*").order("created_at", { ascending: false });
    setUpdates((data as Update[]) || []);
  };

  const postUpdate = async () => {
    if (!updateForm.title || !updateForm.body) return;
    setPostingUpdate(true);
    const supabase = createClient();
    let image_url: string | null = null;

    if (updateImage) {
      const ext = updateImage.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("promotions").upload(path, updateImage);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("promotions").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }
    }

    await supabase.from("updates").insert({ ...updateForm, image_url });
    setUpdateForm({ title: "", body: "", category: "announcement", pinned: false });
    setUpdateImage(null);
    setUpdateImagePreview(null);
    setShowUpdateForm(false);
    setPostingUpdate(false);
    loadUpdates();
  };

  const deleteUpdate = async (id: string) => {
    const supabase = createClient();
    await supabase.from("updates").delete().eq("id", id);
    setUpdates((prev) => prev.filter((u) => u.id !== id));
  };

  const togglePin = async (update: Update) => {
    const supabase = createClient();
    await supabase.from("updates").update({ pinned: !update.pinned }).eq("id", update.id);
    setUpdates((prev) => prev.map((u) => u.id === update.id ? { ...u, pinned: !u.pinned } : u));
  };

  const handleScan = useCallback(async (text: string) => {
    if (scannedUser || scanSuccess) return;
    setScannerActive(false);
    setScanError("");
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").eq("id", text).single();
    if (!data) {
      setScanError("User not found. Please try again.");
      setTimeout(() => { setScanError(""); setScannerActive(true); }, 2500);
      return;
    }
    setScannedUser(data as Member);
  }, [scannedUser, scanSuccess]);

  const confirmAttendance = async () => {
    if (!scannedUser) return;
    if (scannedUser.class_balance <= 0) {
      setScanError("This member has no classes remaining.");
      return;
    }
    setConfirmLoading(true);
    const supabase = createClient();
    await supabase.from("profiles").update({
      class_balance: scannedUser.class_balance - 1,
      classes_taken: (scannedUser.classes_taken || 0) + 1,
    }).eq("id", scannedUser.id);
    setConfirmLoading(false);
    setScanSuccess(true);
    setScannedUser(null);
    loadMembers();
    setTimeout(() => {
      setScanSuccess(false);
      setScannerActive(true);
    }, 3000);
  };

  const resetScan = () => {
    setScannedUser(null);
    setScanError("");
    setScanSuccess(false);
    setScannerActive(true);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0ece6" }}>
      <p style={{ color: "#a8a29e", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  const weekDays = getWeekDays(weekOffset);
  const pendingMembers = members.filter((m) => !m.is_approved);
  const approvedMembers = members.filter((m) => m.is_approved);
  const filteredMembers = approvedMembers.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const TABS = [
    { key: "schedule", label: "Schedule" },
    { key: "checkin", label: "Check-in", badge: todayClasses.length > 0 ? todayClasses.length : null },
    { key: "scan", label: "Scan" },
    { key: "members", label: "Members", badge: pendingMembers.length > 0 ? pendingMembers.length : null },
    { key: "penalties", label: "Fines" },
    { key: "updates", label: "Posts" },
  ] as const;

  return (
    <main style={{ background: "#f0ece6", minHeight: "100vh", paddingBottom: "48px" }}>

      {/* Dark header */}
      <div style={{ background: "#1c1917", padding: "52px 24px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <p style={{ color: "#a8a29e", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>BRN LAB</p>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c4a355", border: "1px solid #c4a355", borderRadius: "100px", padding: "2px 8px" }}>Admin</span>
        </div>
        <h1 style={{ color: "white", fontSize: "2rem", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Dashboard</h1>
        <Link href="/account" style={{ color: "#78716c", fontSize: "0.72rem", textDecoration: "none", display: "inline-block", marginTop: "6px" }}>← Back to Account</Link>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", background: "white", borderBottom: "1px solid #e2d9ce", overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === "scan") { setScannerActive(true); }
              else { setScannerActive(false); setScannedUser(null); setScanSuccess(false); setScanError(""); }
            }}
            style={{
              flexShrink: 0,
              padding: "13px 10px",
              background: "transparent", border: "none",
              borderBottom: tab === t.key ? "2px solid #1c1917" : "2px solid transparent",
              color: tab === t.key ? "#1c1917" : "#a8a29e",
              fontSize: "0.62rem", fontWeight: 700,
              letterSpacing: "0.04em", textTransform: "uppercase",
              cursor: "pointer", marginBottom: "-1px",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            {t.label}
            {"badge" in t && t.badge && (
              <span style={{ background: "#b84040", color: "white", borderRadius: "100px", padding: "1px 6px", fontSize: "0.6rem", fontWeight: 700 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 20px 48px" }}>

        {/* ── SCHEDULE ── */}
        {tab === "schedule" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Week nav */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => { const o = weekOffset - 1; setWeekOffset(o); loadClasses(o); }} style={s.btnGhost}>← Prev</button>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#78716c" }}>
                {formatDate(weekDays[0])} – {formatDate(weekDays[6])}
              </p>
              <button onClick={() => { const o = weekOffset + 1; setWeekOffset(o); loadClasses(o); }} style={s.btnGhost}>Next →</button>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px" }}>
              <Link href="/admin/schedule/new" style={{ ...s.btnPrimary, flex: 1, textAlign: "center", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                + Add Class
              </Link>
              <button onClick={generateNextWeek} style={{ ...s.btnOutline, flex: 1 }}>
                From Template
              </button>
            </div>

            {loadingClasses ? (
              <p style={{ textAlign: "center", color: "#a8a29e", padding: "40px 0", fontSize: "0.8rem" }}>Loading...</p>
            ) : classes.length === 0 ? (
              <div style={{ ...s.card, padding: "40px 24px", textAlign: "center" }}>
                <p style={{ color: "#a8a29e", fontSize: "0.88rem" }}>No classes this week</p>
              </div>
            ) : (
              weekDays.map((date) => {
                const dayClasses = classes.filter((c) => c.date === date);
                if (dayClasses.length === 0) return null;
                return (
                  <div key={date}>
                    <p style={{ ...s.label, marginBottom: "8px", paddingLeft: "4px" }}>{formatDate(date)}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {dayClasses.map((cls) => (
                        <div key={cls.id} style={s.card}>
                          <div style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <p style={{ fontSize: "0.72rem", color: "#a8a29e", letterSpacing: "0.06em", marginBottom: "2px" }}>{formatTime(cls.time)}</p>
                                <p style={{ fontWeight: 700, color: "#1c1917", fontSize: "0.95rem" }}>{cls.class_name}</p>
                                <p style={{ fontSize: "0.78rem", color: "#78716c" }}>{cls.coach_name}</p>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: cls.bookings.length >= cls.capacity ? "#b84040" : "#8b6f47" }}>
                                  {cls.bookings.length}/{cls.capacity}
                                </span>
                                <button onClick={() => deleteClass(cls.id)} style={s.btnDanger}>Delete</button>
                              </div>
                            </div>
                            {cls.bookings.length > 0 && (
                              <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #f0ece6" }}>
                                {cls.bookings.map((b, i) => (
                                  <p key={i} style={{ fontSize: "0.78rem", color: "#78716c", lineHeight: 1.9 }}>{b.profiles?.name}</p>
                                ))}
                                {cls.waitlist?.length > 0 && (
                                  <p style={{ fontSize: "0.72rem", color: "#a8a29e", marginTop: "2px" }}>+{cls.waitlist.length} on waitlist</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── CHECK-IN ── */}
        {tab === "checkin" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={s.sectionTitle}>Today&apos;s Classes</p>
              <button onClick={loadTodayClasses} style={s.btnGhost}>Refresh</button>
            </div>

            {todayClasses.length === 0 ? (
              <div style={{ ...s.card, padding: "48px 24px", textAlign: "center" }}>
                <p style={{ color: "#a8a29e", fontSize: "0.88rem" }}>No classes today</p>
              </div>
            ) : (
              todayClasses.map((cls) => (
                <div key={cls.id} style={s.card}>
                  <div style={{ padding: "16px 18px", borderBottom: "1px solid #f0ece6", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontSize: "0.72rem", color: "#a8a29e", marginBottom: "2px" }}>{formatTime(cls.time)}</p>
                      <p style={{ fontWeight: 700, color: "#1c1917", fontSize: "1rem" }}>{cls.class_name}</p>
                      <p style={{ fontSize: "0.78rem", color: "#78716c" }}>{cls.coach_name}</p>
                    </div>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#8b6f47" }}>
                      {cls.bookings.filter((b) => b.checked_in).length}/{cls.bookings.length} in
                    </span>
                  </div>
                  <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {cls.bookings.length === 0 ? (
                      <p style={{ fontSize: "0.82rem", color: "#a8a29e" }}>No bookings</p>
                    ) : cls.bookings.map((b) => (
                      <div key={b.user_id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px", borderRadius: "10px",
                        background: b.checked_in ? "#f0f7f3" : "#faf7f4",
                        border: `1px solid ${b.checked_in ? "#3d7a5a" : "#e2d9ce"}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: b.checked_in ? "#3d7a5a" : "#c9bfb3", flexShrink: 0 }} />
                          <span style={{ fontSize: "0.88rem", color: "#1c1917", fontWeight: b.checked_in ? 600 : 400 }}>{b.profiles?.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {b.checked_in && (
                            <button onClick={() => markLateArrival(cls.id, b.user_id)} style={{ ...s.btnGhost, color: "#b84040", fontSize: "0.68rem" }}>Late</button>
                          )}
                          <button
                            onClick={() => toggleCheckIn(cls.id, b.user_id, b.checked_in)}
                            disabled={checkingIn === `${cls.id}-${b.user_id}`}
                            style={{
                              padding: "5px 14px", borderRadius: "100px", border: "none", cursor: "pointer",
                              background: b.checked_in ? "#3d7a5a" : "#1c1917",
                              color: "white", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em",
                            }}
                          >
                            {checkingIn === `${cls.id}-${b.user_id}` ? "..." : b.checked_in ? "✓ In" : "Check In"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── MEMBERS ── */}
        {tab === "members" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {pendingMembers.length > 0 && (
              <div>
                <p style={{ ...s.label, marginBottom: "10px" }}>Pending Approval ({pendingMembers.length})</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {pendingMembers.map((m) => (
                    <div key={m.id} style={{ ...s.card, border: "1px solid #c4a355" }}>
                      <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{ fontWeight: 700, color: "#1c1917", fontSize: "0.92rem" }}>{m.name}</p>
                          <p style={{ fontSize: "0.75rem", color: "#78716c", marginTop: "2px" }}>{m.email}</p>
                          <p style={{ fontSize: "0.68rem", color: "#a8a29e", marginTop: "2px" }}>Requested {new Date(m.created_at).toLocaleDateString()}</p>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => approveUser(m.id)} style={s.btnPrimary}>Approve</button>
                          <button onClick={() => rejectUser(m.id)} style={s.btnDanger}>Reject</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ height: "1px", background: "#e2d9ce", margin: "8px 0" }} />
              </div>
            )}

            <input
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              style={s.input}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredMembers.map((m) => (
                <div key={m.id} style={s.card}>
                  <div style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <p style={{ fontWeight: 700, color: "#1c1917", fontSize: "0.92rem" }}>{m.name}</p>
                          {m.is_admin && <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "#c4a355", border: "1px solid #c4a355", borderRadius: "100px", padding: "1px 6px", letterSpacing: "0.08em" }}>ADMIN</span>}
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "#78716c", marginTop: "2px" }}>{m.email}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "1.6rem", fontWeight: 700, color: "#8b6f47", lineHeight: 1 }}>{m.class_balance}</p>
                        <p style={{ fontSize: "0.6rem", color: "#a8a29e", letterSpacing: "0.06em", textTransform: "uppercase" }}>classes left</p>
                      </div>
                    </div>
                    <div style={{ borderTop: "1px solid #f0ece6", marginTop: "12px", paddingTop: "12px" }}>
                      <p style={{ fontSize: "0.72rem", color: "#a8a29e", marginBottom: "8px" }}>{m.classes_taken || 0} classes taken</p>
                      {addingTo === m.id ? (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input type="number" min="1" max="100" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} style={{ ...s.input, width: "70px" }} />
                          <button onClick={() => addBalance(m.id)} style={s.btnPrimary}>Add</button>
                          <button onClick={() => setAddingTo(null)} style={s.btnGhost}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setAddingTo(m.id)} style={s.btnGhost}>+ Add Classes</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PENALTIES ── */}
        {tab === "penalties" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={s.sectionTitle}>Penalty Log</p>
              <button onClick={() => setAddPenaltyOpen(true)} style={s.btnPrimary}>+ Add</button>
            </div>

            {addPenaltyOpen && (
              <div style={{ ...s.card, padding: "18px" }}>
                <p style={{ ...s.label, marginBottom: "14px" }}>Add Penalty</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <select value={penaltyForm.user_id} onChange={(e) => setPenaltyForm((f) => ({ ...f, user_id: e.target.value }))} style={s.input}>
                    <option value="">Select member...</option>
                    {approvedMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <select value={penaltyForm.type} onChange={(e) => setPenaltyForm((f) => ({ ...f, type: e.target.value }))} style={s.input}>
                    <option value="late_cancel">Late Cancellation</option>
                    <option value="late_arrival">Late Arrival</option>
                  </select>
                  <input placeholder="Notes (optional)" value={penaltyForm.notes} onChange={(e) => setPenaltyForm((f) => ({ ...f, notes: e.target.value }))} style={s.input} />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={addPenalty} style={{ ...s.btnPrimary, flex: 1 }}>Save</button>
                    <button onClick={() => setAddPenaltyOpen(false)} style={{ ...s.btnOutline, flex: 1 }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {penalties.length === 0 ? (
              <div style={{ ...s.card, padding: "48px 24px", textAlign: "center" }}>
                <p style={{ color: "#a8a29e", fontSize: "0.88rem" }}>No penalties recorded</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {penalties.map((p) => (
                  <div key={p.id} style={{ ...s.card, padding: "14px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <span style={{
                          display: "inline-block", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em",
                          textTransform: "uppercase", borderRadius: "100px", padding: "2px 8px", marginBottom: "6px",
                          background: p.type === "late_cancel" ? "#fdf2f2" : "#fdf6ec",
                          color: p.type === "late_cancel" ? "#b84040" : "#8b6f47",
                        }}>
                          {p.type === "late_cancel" ? "Late Cancel" : "Late Arrival"}
                        </span>
                        <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1c1917" }}>{p.profiles?.name}</p>
                        {p.classes && <p style={{ fontSize: "0.75rem", color: "#78716c", marginTop: "2px" }}>{formatDate(p.classes.date)} · {p.classes.class_name}</p>}
                        {p.notes && <p style={{ fontSize: "0.72rem", color: "#a8a29e", marginTop: "2px" }}>{p.notes}</p>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                        <p style={{ fontSize: "0.68rem", color: "#a8a29e" }}>{new Date(p.created_at).toLocaleDateString()}</p>
                        <button onClick={() => deletePenalty(p.id)} style={s.btnDanger}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SCAN ── */}
        {tab === "scan" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={s.sectionTitle}>Scan Member QR Code</p>

            {/* Success state */}
            {scanSuccess && (
              <div style={{ ...s.card, padding: "40px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "12px" }}>✓</div>
                <p style={{ fontWeight: 700, fontSize: "1.1rem", color: "#3d7a5a", marginBottom: "6px" }}>Attendance Confirmed</p>
                <p style={{ fontSize: "0.82rem", color: "#a8a29e" }}>1 class deducted. Scanner restarting...</p>
              </div>
            )}

            {/* Scanned user confirmation */}
            {scannedUser && !scanSuccess && (
              <div style={{ ...s.card, padding: "24px 20px" }}>
                <p style={{ ...s.label, marginBottom: "16px" }}>Member Found</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1c1917" }}>{scannedUser.name}</p>
                    <p style={{ fontSize: "0.78rem", color: "#78716c", marginTop: "2px" }}>{scannedUser.email}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "2rem", fontWeight: 800, color: scannedUser.class_balance > 0 ? "#8b6f47" : "#b84040", lineHeight: 1 }}>
                      {scannedUser.class_balance}
                    </p>
                    <p style={{ fontSize: "0.6rem", color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.06em" }}>classes left</p>
                  </div>
                </div>

                {scanError && <p style={{ color: "#b84040", fontSize: "0.82rem", marginBottom: "12px" }}>{scanError}</p>}

                {scannedUser.class_balance <= 0 ? (
                  <div style={{ background: "#fdf2f2", borderRadius: "10px", padding: "12px 16px", marginBottom: "14px" }}>
                    <p style={{ fontSize: "0.82rem", color: "#b84040", fontWeight: 600 }}>No classes remaining</p>
                    <p style={{ fontSize: "0.75rem", color: "#b84040", opacity: 0.8, marginTop: "2px" }}>Member needs to purchase more classes.</p>
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={confirmAttendance}
                    disabled={confirmLoading || scannedUser.class_balance <= 0}
                    style={{
                      ...s.btnPrimary, flex: 2,
                      opacity: scannedUser.class_balance <= 0 ? 0.4 : 1,
                      cursor: scannedUser.class_balance <= 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    {confirmLoading ? "Confirming..." : "✓ Confirm Attendance"}
                  </button>
                  <button onClick={resetScan} style={{ ...s.btnOutline, flex: 1 }}>Cancel</button>
                </div>
              </div>
            )}

            {/* Scanner */}
            {!scannedUser && !scanSuccess && (
              <div style={{ ...s.card, overflow: "hidden" }}>
                {scanError && (
                  <div style={{ padding: "14px 18px", background: "#fdf2f2", borderBottom: "1px solid #f0ece6" }}>
                    <p style={{ fontSize: "0.82rem", color: "#b84040" }}>{scanError}</p>
                  </div>
                )}
                <div style={{ padding: "16px" }}>
                  <p style={{ fontSize: "0.78rem", color: "#a8a29e", marginBottom: "14px", textAlign: "center" }}>
                    Point the camera at the member&apos;s QR code
                  </p>
                  <QRScanner onScan={handleScan} active={scannerActive} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── UPDATES ── */}
        {tab === "updates" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={s.sectionTitle}>Studio Updates</p>
              <button onClick={() => setShowUpdateForm(!showUpdateForm)} style={s.btnPrimary}>
                {showUpdateForm ? "Cancel" : "+ Post"}
              </button>
            </div>

            {showUpdateForm && (
              <div style={{ ...s.card, padding: "18px" }}>
                <p style={{ ...s.label, marginBottom: "14px" }}>New Update</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <select value={updateForm.category} onChange={(e) => setUpdateForm((f) => ({ ...f, category: e.target.value }))} style={s.input}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                  <input placeholder="Title" value={updateForm.title} onChange={(e) => setUpdateForm((f) => ({ ...f, title: e.target.value }))} style={s.input} />
                  <textarea rows={4} placeholder="Write your update..." value={updateForm.body} onChange={(e) => setUpdateForm((f) => ({ ...f, body: e.target.value }))} style={{ ...s.input, resize: "none" }} />
                  {/* Image picker */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#78716c", marginBottom: "8px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Photo (optional)
                    </label>
                    <label style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      gap: "8px", padding: "14px", border: "1.5px dashed #c9bfb3",
                      borderRadius: "10px", cursor: "pointer", background: updateImagePreview ? "transparent" : "#faf9f7",
                    }}>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setUpdateImage(file);
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setUpdateImagePreview(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          } else {
                            setUpdateImagePreview(null);
                          }
                        }}
                      />
                      {updateImagePreview ? (
                        <img src={updateImagePreview} alt="preview" style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "8px" }} />
                      ) : (
                        <span style={{ fontSize: "0.82rem", color: "#a8a29e" }}>Tap to add a photo</span>
                      )}
                    </label>
                    {updateImagePreview && (
                      <button
                        onClick={() => { setUpdateImage(null); setUpdateImagePreview(null); }}
                        style={{ marginTop: "6px", background: "none", border: "none", color: "#b84040", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input type="checkbox" checked={updateForm.pinned} onChange={(e) => setUpdateForm((f) => ({ ...f, pinned: e.target.checked }))} />
                    <span style={{ fontSize: "0.82rem", color: "#78716c" }}>Pin this update</span>
                  </label>
                  <button onClick={postUpdate} disabled={postingUpdate} style={s.btnPrimary}>{postingUpdate ? "Posting..." : "Post Update"}</button>
                </div>
              </div>
            )}

            {updates.length === 0 ? (
              <div style={{ ...s.card, padding: "48px 24px", textAlign: "center" }}>
                <p style={{ color: "#a8a29e", fontSize: "0.88rem" }}>No updates posted yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {updates.map((u) => (
                  <div key={u.id} style={{ ...s.card, padding: "14px 18px", border: u.pinned ? "1px solid #c4a355" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "#f0ece6", color: "#8b6f47", borderRadius: "100px", padding: "2px 8px" }}>
                          {CATEGORY_LABELS[u.category] || u.category}
                        </span>
                        {u.pinned && <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "#fdf6ec", color: "#c4a355", borderRadius: "100px", padding: "2px 8px" }}>Pinned</span>}
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={() => togglePin(u)} style={s.btnGhost}>{u.pinned ? "Unpin" : "Pin"}</button>
                        <button onClick={() => deleteUpdate(u.id)} style={s.btnDanger}>Delete</button>
                      </div>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1c1917", marginBottom: "4px" }}>{u.title}</p>
                    <p style={{ fontSize: "0.8rem", color: "#78716c", lineHeight: 1.6 }}>{u.body}</p>
                    <p style={{ fontSize: "0.68rem", color: "#a8a29e", marginTop: "8px" }}>{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
