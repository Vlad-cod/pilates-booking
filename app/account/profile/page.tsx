"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const UserQRCode = dynamic(() => import("../../components/UserQRCode"), { ssr: false });

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  injuries: string | null;
  emergency_name: string | null;
  emergency_phone: string | null;
  emergency_relationship: string | null;
  emergency_email: string | null;
}

const inputStyle: React.CSSProperties = {
  width: "100%", border: "none", borderBottom: "1px solid #d6d6d6",
  background: "transparent", fontSize: "0.95rem", color: "#1a1a1a",
  padding: "4px 0 10px", outline: "none", fontFamily: "inherit",
};

function LineField({ label, value, onChange, type = "text", placeholder }: {
  label: string; value?: string | null; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <p style={{ fontSize: "0.72rem", color: "#9e9e9e", marginBottom: "6px" }}>{label}</p>
      <input type={type} value={value || ""} placeholder={placeholder || label} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSent, setPwSent] = useState(false);
  const [pwSending, setPwSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      if (prof) { setProfile(prof as Profile); setForm(prof as Profile); }
      setLoading(false);
    });
  }, [router]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({
      name: form.name, phone: form.phone, birthday: form.birthday,
      injuries: form.injuries, emergency_name: form.emergency_name,
      emergency_phone: form.emergency_phone,
      emergency_relationship: form.emergency_relationship,
      emergency_email: form.emergency_email,
    }).eq("id", profile.id);
    setProfile((p) => p ? { ...p, ...form } : p);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sendPasswordReset = async () => {
    if (!profile) return;
    setPwSending(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPwSent(true);
    setPwSending(false);
  };

  if (loading || !profile) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0ece6" }}>
      <p style={{ color: "#a8a29e", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  return (
    <main style={{ background: "white", minHeight: "100vh", paddingBottom: "48px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "56px 24px 16px", borderBottom: "1px solid #f0f0f0" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#1a1a1a", fontSize: "0.88rem", cursor: "pointer", padding: 0 }}>← Back</button>
        <p style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a1a" }}>Personal Information</p>
        <button onClick={save} disabled={saving} style={{ background: "none", border: "none", color: "#1a1a1a", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", padding: 0 }}>
          {saved ? "Saved ✓" : saving ? "..." : "Save"}
        </button>
      </div>

      {/* QR Code */}
      <div style={{ background: "#f0ece6", borderBottom: "1px solid #e8e2da" }}>
        <UserQRCode userId={profile.id} />
      </div>

      {/* Form */}
      <div style={{ padding: "24px 24px 48px", display: "flex", flexDirection: "column", gap: "22px" }}>

        <LineField label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
        <LineField label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="+84 000 000 000" />
        <LineField label="Birthday" value={form.birthday} type="date" onChange={(v) => setForm((f) => ({ ...f, birthday: v }))} />

        {/* Health */}
        <div>
          <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "16px" }}>Health &amp; Injuries</p>
          <p style={{ fontSize: "0.72rem", color: "#9e9e9e", marginBottom: "6px" }}>Injuries / conditions</p>
          <textarea
            rows={3} value={form.injuries || ""}
            placeholder="Any injuries or conditions we should know about..."
            onChange={(e) => setForm((f) => ({ ...f, injuries: e.target.value }))}
            style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }}
          />
        </div>

        {/* Password */}
        <div>
          <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "16px" }}>Password</p>
          {!pwOpen ? (
            <button onClick={() => setPwOpen(true)} style={{ width: "100%", padding: "13px 0", background: "transparent", border: "1.5px solid #1a1a1a", borderRadius: "8px", fontSize: "0.95rem", fontWeight: 700, color: "#1a1a1a", cursor: "pointer" }}>
              Change Password
            </button>
          ) : pwSent ? (
            <p style={{ fontSize: "0.88rem", color: "#3d7a5a", fontWeight: 600 }}>Reset link sent — check your email.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <p style={{ fontSize: "0.82rem", color: "#9e9e9e" }}>Send a reset link to <strong style={{ color: "#1a1a1a" }}>{profile.email}</strong></p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setPwOpen(false)} style={{ flex: 1, padding: "11px 0", background: "transparent", border: "1px solid #d6d6d6", borderRadius: "8px", fontSize: "0.82rem", color: "#9e9e9e", cursor: "pointer" }}>Cancel</button>
                <button onClick={sendPasswordReset} disabled={pwSending} style={{ flex: 2, padding: "11px 0", background: "#1a1a1a", border: "none", borderRadius: "8px", fontSize: "0.82rem", fontWeight: 700, color: "white", cursor: "pointer" }}>
                  {pwSending ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div>
          <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "16px" }}>Emergency Contact</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <LineField label="Name" value={form.emergency_name} onChange={(v) => setForm((f) => ({ ...f, emergency_name: v }))} placeholder="Contact name" />
            <LineField label="Relationship" value={form.emergency_relationship} onChange={(v) => setForm((f) => ({ ...f, emergency_relationship: v }))} placeholder="e.g. Partner, Parent" />
            <LineField label="Email" value={form.emergency_email} type="email" onChange={(v) => setForm((f) => ({ ...f, emergency_email: v }))} placeholder="contact@email.com" />
            <LineField label="Phone Number" value={form.emergency_phone} onChange={(v) => setForm((f) => ({ ...f, emergency_phone: v }))} placeholder="+84 000 000 000" />
          </div>
        </div>

        {/* Save button */}
        <button onClick={save} disabled={saving} style={{ width: "100%", padding: "16px", background: "#c4a355", border: "none", borderRadius: "10px", fontSize: "1rem", fontWeight: 700, color: "white", cursor: "pointer", marginTop: "8px" }}>
          {saved ? "Saved!" : saving ? "Saving..." : "Save"}
        </button>

        {/* Delete Account */}
        <button
          onClick={async () => {
            if (!confirm("Are you sure you want to delete your account?")) return;
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/");
          }}
          style={{ background: "none", border: "none", textDecoration: "underline", color: "#9e9e9e", fontSize: "0.88rem", cursor: "pointer", padding: "4px 0" }}
        >
          Delete Account
        </button>
      </div>
    </main>
  );
}
