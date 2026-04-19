"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import BottomNav from "../components/BottomNav";

interface Update {
  id: string;
  title: string;
  body: string;
  category: "announcement" | "coach" | "promotion" | "holiday" | "schedule";
  created_at: string;
  pinned: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  announcement: "Announcement",
  coach: "New Coach",
  promotion: "Promotion",
  holiday: "Holiday Schedule",
  schedule: "Schedule Change",
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  announcement: { bg: "var(--accent-bg)", color: "var(--accent)" },
  coach: { bg: "var(--success-light)", color: "var(--success)" },
  promotion: { bg: "#fdf6ec", color: "#b07d2e" },
  holiday: { bg: "var(--danger-light)", color: "var(--danger)" },
  schedule: { bg: "#f0eef8", color: "#6b5ea8" },
};

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }

      const { data: items } = await supabase
        .from("updates")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      setUpdates((items as Update[]) || []);
      setLoading(false);
    });
  }, [router]);

  const filtered = filter === "all" ? updates : updates.filter((u) => u.category === filter);
  const categories = ["all", ...Array.from(new Set(updates.map((u) => u.category)))];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <p className="label" style={{ color: "var(--text-light)" }}>Loading...</p>
    </div>
  );

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", paddingBottom: "80px" }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="btn-ghost" style={{ padding: "6px 0" }}>← Back</button>
        <span className="nav-logo" style={{ fontSize: "0.9rem" }}>BRN LAB</span>
      </div>

      <div className="px-6 pt-2 pb-6">
        <p className="label mb-1">Studio</p>
        <h1 className="display text-4xl" style={{ color: "var(--text)" }}>Updates</h1>
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div
          className="flex gap-2 px-6 pb-6 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: "6px 16px",
                borderRadius: "100px",
                border: filter === cat ? "1.5px solid var(--text)" : "1px solid var(--border)",
                background: filter === cat ? "var(--text)" : "var(--bg-card)",
                color: filter === cat ? "var(--bg)" : "var(--text-muted)",
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      )}

      {/* Updates list */}
      <div className="px-6 pb-12 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="card px-6 py-12 text-center">
            <p className="display text-xl mb-2" style={{ color: "var(--text-muted)" }}>No updates yet</p>
            <p style={{ color: "var(--text-light)", fontSize: "0.82rem" }}>Check back soon for studio news.</p>
          </div>
        ) : (
          filtered.map((update) => {
            const colors = CATEGORY_COLORS[update.category] || CATEGORY_COLORS.announcement;
            return (
              <div
                key={update.id}
                className="card px-6 py-5"
                style={update.pinned ? { borderColor: "var(--accent-light)" } : {}}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="badge"
                      style={{ background: colors.bg, color: colors.color }}
                    >
                      {CATEGORY_LABELS[update.category] || update.category}
                    </span>
                    {update.pinned && (
                      <span className="badge badge-accent">Pinned</span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-light)", letterSpacing: "0.04em" }}>
                    {formatRelativeDate(update.created_at)}
                  </span>
                </div>

                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", marginBottom: "8px", lineHeight: 1.3 }}>
                  {update.title}
                </h3>
                <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", lineHeight: 1.65 }}>
                  {update.body}
                </p>
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </main>
  );
}
