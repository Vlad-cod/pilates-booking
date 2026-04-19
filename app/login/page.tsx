"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type View = "welcome" | "signin" | "forgot";

export default function LoginPage() {
  const [view, setView] = useState<View>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSent(true);
    setResetLoading(false);
  };

  return (
    <main style={{
      minHeight: "100vh",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Background photo */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        zIndex: 0,
      }} />

      {/* Overlay — darker when form is open */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: view === "welcome"
          ? "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.75) 100%)"
          : "rgba(0,0,0,0.72)",
        zIndex: 1,
        transition: "background 0.3s ease",
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Studio name — top center */}
        <div style={{ textAlign: "center", paddingTop: "60px" }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.6rem",
            fontWeight: 400,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "white",
          }}>
            BRN LAB
          </p>
        </div>

        {/* Bottom section */}
        <div style={{ marginTop: "auto", padding: "0 28px 52px" }}>

          {/* WELCOME — two buttons */}
          {view === "welcome" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                onClick={() => { setError(""); setView("signin"); }}
                style={{
                  width: "100%", padding: "17px",
                  background: "#c4a355",
                  border: "none", borderRadius: "10px",
                  color: "white", fontSize: "1rem", fontWeight: 700,
                  cursor: "pointer", letterSpacing: "0.04em",
                }}
              >
                Sign In
              </button>
              <Link
                href="/signup"
                style={{
                  display: "block", textAlign: "center",
                  width: "100%", padding: "17px",
                  background: "transparent",
                  border: "1.5px solid rgba(255,255,255,0.6)",
                  borderRadius: "10px",
                  color: "white", fontSize: "1rem", fontWeight: 600,
                  textDecoration: "none", letterSpacing: "0.04em",
                  boxSizing: "border-box",
                }}
              >
                Create Account
              </Link>
            </div>
          )}

          {/* SIGN IN form */}
          {view === "signin" && (
            <div>
              <button
                onClick={() => { setView("welcome"); setError(""); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", cursor: "pointer", padding: 0, marginBottom: "24px", letterSpacing: "0.06em" }}
              >
                ‹ Back
              </button>
              <h2 style={{ color: "white", fontSize: "1.8rem", fontWeight: 700, marginBottom: "24px" }}>Sign In</h2>
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%", padding: "15px 16px",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: "10px", color: "white",
                    fontSize: "0.95rem", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%", padding: "15px 16px",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: "10px", color: "white",
                    fontSize: "0.95rem", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {error && (
                  <p style={{ color: "#ff8080", fontSize: "0.82rem" }}>{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%", padding: "16px",
                    background: "#c4a355", border: "none",
                    borderRadius: "10px", color: "white",
                    fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                    opacity: loading ? 0.7 : 1,
                    marginTop: "4px",
                  }}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
              <button
                onClick={() => { setView("forgot"); setError(""); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: "0.8rem", cursor: "pointer", marginTop: "16px", display: "block", width: "100%", textAlign: "center" }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* FORGOT PASSWORD form */}
          {view === "forgot" && !resetSent && (
            <div>
              <button
                onClick={() => { setView("signin"); setError(""); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", cursor: "pointer", padding: 0, marginBottom: "24px", letterSpacing: "0.06em" }}
              >
                ‹ Back
              </button>
              <h2 style={{ color: "white", fontSize: "1.8rem", fontWeight: 700, marginBottom: "8px" }}>Reset Password</h2>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: "24px" }}>We&apos;ll send a reset link to your email.</p>
              <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%", padding: "15px 16px",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: "10px", color: "white",
                    fontSize: "0.95rem", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{
                    width: "100%", padding: "16px",
                    background: "#c4a355", border: "none",
                    borderRadius: "10px", color: "white",
                    fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                    opacity: resetLoading ? 0.7 : 1,
                  }}
                >
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </div>
          )}

          {/* RESET SENT confirmation */}
          {view === "forgot" && resetSent && (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "white", fontSize: "1.4rem", fontWeight: 700, marginBottom: "8px" }}>Check your email</p>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", marginBottom: "28px" }}>
                We sent a reset link to <strong style={{ color: "white" }}>{email}</strong>
              </p>
              <button
                onClick={() => { setResetSent(false); setView("signin"); }}
                style={{
                  background: "none", border: "1.5px solid rgba(255,255,255,0.4)",
                  borderRadius: "10px", color: "white",
                  padding: "14px 32px", fontSize: "0.9rem", cursor: "pointer",
                }}
              >
                Back to Sign In
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
