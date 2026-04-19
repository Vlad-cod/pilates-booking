"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 2000);
  };

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg)" }}>
        <div className="card px-8 py-10 text-center" style={{ maxWidth: "400px", width: "100%" }}>
          <div style={{ fontSize: "2rem", marginBottom: "16px" }}>✓</div>
          <h2 className="display text-2xl mb-2" style={{ color: "var(--text)" }}>Password updated</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Redirecting you to the app...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: "400px", width: "100%" }}>
        <div className="text-center mb-12">
          <span className="nav-logo" style={{ fontSize: "1.4rem" }}>BRN LAB</span>
          <p className="label mt-2">Pilates Studio</p>
        </div>

        <div className="card px-8 py-10">
          <h1 className="display text-3xl mb-2" style={{ color: "var(--text)" }}>New Password</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "24px" }}>
            Choose a new password for your account.
          </p>

          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div>
              <label className="label block mb-2">New Password</label>
              <input
                className="input"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label block mb-2">Confirm Password</label>
              <input
                className="input"
                type="password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && (
              <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
