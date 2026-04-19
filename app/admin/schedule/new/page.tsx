"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Template {
  id: string;
  day_of_week: number;
  time: string;
  class_name: string;
  coach_name: string;
  capacity: number;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_CLASS_NAMES = [
  "Reformer Pilates", "Mat Pilates", "Pilates Sculpt",
  "Pilates Flow", "Core & Stretch", "Full Body Reformer", "Beginner Reformer",
];

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid #e2d9ce", borderRadius: "10px",
  padding: "11px 14px", fontSize: "0.88rem", color: "#1c1917",
  background: "#faf7f4", outline: "none", fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em",
  textTransform: "uppercase", color: "#a8a29e", marginBottom: "6px", display: "block",
};

export default function NewSchedulePage() {
  const [tab, setTab] = useState<"single" | "template">("single");
  const router = useRouter();

  const [singleForm, setSingleForm] = useState({ date: "", time: "", class_name: "", coach_name: "", capacity: "8", description: "" });
  const [savingSingle, setSavingSingle] = useState(false);
  const [savedSingle, setSavedSingle] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateForm, setTemplateForm] = useState({ day_of_week: "1", time: "", class_name: "", coach_name: "", capacity: "8" });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", data.user.id).single();
      if (!prof?.is_admin) { router.push("/"); return; }
      loadTemplates();
    });
  }, [router]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    const supabase = createClient();
    const { data } = await supabase.from("class_templates").select("*").order("day_of_week").order("time");
    setTemplates((data as Template[]) || []);
    setLoadingTemplates(false);
  };

  const saveSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSingle(true);
    const supabase = createClient();
    const { error } = await supabase.from("classes").insert({
      date: singleForm.date, time: singleForm.time,
      class_name: singleForm.class_name, coach_name: singleForm.coach_name,
      capacity: parseInt(singleForm.capacity),
      description: singleForm.description || null,
    });
    if (error) { alert(error.message); setSavingSingle(false); return; }
    setSavedSingle(true);
    setSavingSingle(false);
    setSingleForm({ date: "", time: "", class_name: "", coach_name: "", capacity: "8", description: "" });
    setTimeout(() => setSavedSingle(false), 2500);
  };

  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTemplate(true);
    const supabase = createClient();
    await supabase.from("class_templates").insert({
      day_of_week: parseInt(templateForm.day_of_week), time: templateForm.time,
      class_name: templateForm.class_name, coach_name: templateForm.coach_name,
      capacity: parseInt(templateForm.capacity),
    });
    setTemplateForm({ day_of_week: "1", time: "", class_name: "", coach_name: "", capacity: "8" });
    setSavingTemplate(false);
    loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    const supabase = createClient();
    await supabase.from("class_templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <main style={{ background: "#f0ece6", minHeight: "100vh", paddingBottom: "48px" }}>

      {/* Dark header */}
      <div style={{ background: "#1c1917", padding: "52px 24px 24px" }}>
        <Link href="/admin" style={{ color: "#78716c", fontSize: "0.72rem", textDecoration: "none", display: "inline-block", marginBottom: "12px" }}>← Dashboard</Link>
        <p style={{ color: "#a8a29e", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px" }}>Admin</p>
        <h1 style={{ color: "white", fontSize: "2rem", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Schedule Builder</h1>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", background: "white", borderBottom: "1px solid #e2d9ce" }}>
        {([["single", "One-Off Class"], ["template", "Weekly Template"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, padding: "13px 0",
              background: "transparent", border: "none",
              borderBottom: tab === key ? "2px solid #1c1917" : "2px solid transparent",
              color: tab === key ? "#1c1917" : "#a8a29e",
              fontSize: "0.68rem", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              cursor: "pointer", marginBottom: "-1px",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px 20px" }}>

        {/* ── ONE-OFF CLASS ── */}
        {tab === "single" && (
          <div>
            {savedSingle && (
              <div style={{ background: "#f0f7f3", border: "1px solid #3d7a5a", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px" }}>
                <p style={{ fontSize: "0.85rem", color: "#3d7a5a", fontWeight: 600 }}>Class added to schedule!</p>
              </div>
            )}
            <p style={{ fontSize: "0.82rem", color: "#78716c", marginBottom: "20px", lineHeight: 1.6 }}>
              Add a one-off class for a specific date.
            </p>
            <form onSubmit={saveSingle}>
              <div style={{ background: "white", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden", marginBottom: "16px" }}>
                {[
                  { label: "Date", key: "date", type: "date" },
                  { label: "Time", key: "time", type: "time" },
                  { label: "Coach Name", key: "coach_name", type: "text", placeholder: "Coach full name" },
                  { label: "Capacity", key: "capacity", type: "number" },
                ].map((field, i, arr) => (
                  <div key={field.key} style={{ padding: "14px 18px", borderBottom: i < arr.length - 1 ? "1px solid #f0ece6" : "none" }}>
                    <label style={labelStyle}>{field.label}</label>
                    <input
                      type={field.type}
                      required
                      placeholder={field.placeholder}
                      min={field.type === "number" ? "1" : undefined}
                      max={field.type === "number" ? "20" : undefined}
                      value={singleForm[field.key as keyof typeof singleForm]}
                      onChange={(e) => setSingleForm((f) => ({ ...f, [field.key]: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ))}
                {/* Class name with datalist */}
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0ece6" }}>
                  <label style={labelStyle}>Class Name</label>
                  <input
                    list="class-names" required
                    placeholder="e.g. Reformer Pilates"
                    value={singleForm.class_name}
                    onChange={(e) => setSingleForm((f) => ({ ...f, class_name: e.target.value }))}
                    style={inputStyle}
                  />
                  <datalist id="class-names">
                    {DEFAULT_CLASS_NAMES.map((n) => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <label style={labelStyle}>Class Description (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Describe what students can expect..."
                    value={singleForm.description}
                    onChange={(e) => setSingleForm((f) => ({ ...f, description: e.target.value }))}
                    style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSingle}
                style={{
                  width: "100%", padding: "14px", background: "#1c1917", border: "none",
                  borderRadius: "12px", color: "white", fontSize: "0.88rem", fontWeight: 700,
                  cursor: "pointer", letterSpacing: "0.04em",
                }}
              >
                {savingSingle ? "Adding..." : "Add to Schedule"}
              </button>
            </form>
          </div>
        )}

        {/* ── WEEKLY TEMPLATE ── */}
        {tab === "template" && (
          <div>
            <p style={{ fontSize: "0.82rem", color: "#78716c", marginBottom: "20px", lineHeight: 1.6 }}>
              Build the recurring weekly template. Use &quot;From Template&quot; on the dashboard to generate next week&apos;s schedule.
            </p>

            {/* Add form */}
            <form onSubmit={saveTemplate}>
              <div style={{ background: "white", borderRadius: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden", marginBottom: "16px" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0ece6" }}>
                  <label style={labelStyle}>Day of Week</label>
                  <select value={templateForm.day_of_week} onChange={(e) => setTemplateForm((f) => ({ ...f, day_of_week: e.target.value }))} style={inputStyle}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0ece6" }}>
                  <label style={labelStyle}>Time</label>
                  <input type="time" required value={templateForm.time} onChange={(e) => setTemplateForm((f) => ({ ...f, time: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0ece6" }}>
                  <label style={labelStyle}>Class Name</label>
                  <input list="class-names-2" required placeholder="e.g. Reformer Pilates" value={templateForm.class_name} onChange={(e) => setTemplateForm((f) => ({ ...f, class_name: e.target.value }))} style={inputStyle} />
                  <datalist id="class-names-2">
                    {DEFAULT_CLASS_NAMES.map((n) => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0ece6" }}>
                  <label style={labelStyle}>Coach Name</label>
                  <input required placeholder="Coach full name" value={templateForm.coach_name} onChange={(e) => setTemplateForm((f) => ({ ...f, coach_name: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <label style={labelStyle}>Capacity</label>
                  <input type="number" min="1" max="20" required value={templateForm.capacity} onChange={(e) => setTemplateForm((f) => ({ ...f, capacity: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingTemplate}
                style={{
                  width: "100%", padding: "14px", background: "#1c1917", border: "none",
                  borderRadius: "12px", color: "white", fontSize: "0.88rem", fontWeight: 700,
                  cursor: "pointer", letterSpacing: "0.04em", marginBottom: "24px",
                }}
              >
                {savingTemplate ? "Saving..." : "Add to Template"}
              </button>
            </form>

            {/* Template list */}
            <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a8a29e", marginBottom: "10px" }}>
              Current Template ({templates.length})
            </p>
            {loadingTemplates ? (
              <p style={{ color: "#a8a29e", fontSize: "0.82rem" }}>Loading...</p>
            ) : templates.length === 0 ? (
              <div style={{ background: "white", borderRadius: "14px", padding: "40px 24px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <p style={{ color: "#a8a29e", fontSize: "0.88rem" }}>No template classes yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {templates.map((t) => (
                  <div key={t.id} style={{ background: "white", borderRadius: "14px", padding: "14px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: "0.68rem", color: "#a8a29e", letterSpacing: "0.06em", marginBottom: "2px" }}>{DAYS[t.day_of_week]} · {t.time}</p>
                      <p style={{ fontWeight: 700, color: "#1c1917", fontSize: "0.9rem" }}>{t.class_name}</p>
                      <p style={{ fontSize: "0.75rem", color: "#78716c" }}>{t.coach_name} · {t.capacity} spots</p>
                    </div>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      style={{ background: "none", border: "none", color: "#b84040", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      Remove
                    </button>
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
