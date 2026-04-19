"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSubmitted(true);
    }
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

      {/* Overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        zIndex: 1,
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Studio name */}
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

        {/* Form / Confirmation */}
        <div style={{ marginTop: "auto", padding: "0 28px 52px" }}>

          {submitted ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "white", fontSize: "1.5rem", fontWeight: 700, marginBottom: "10px" }}>Account Created!</p>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: "28px" }}>
                You can now sign in and start booking classes.
              </p>
              <Link
                href="/login"
                style={{
                  display: "inline-block", padding: "14px 32px",
                  border: "1.5px solid rgba(255,255,255,0.4)",
                  borderRadius: "10px", color: "white",
                  fontSize: "0.9rem", textDecoration: "none",
                }}
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <div>
              <Link
                href="/login"
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", cursor: "pointer", marginBottom: "24px", display: "block", textDecoration: "none", letterSpacing: "0.06em" }}
              >
                ‹ Back
              </Link>
              <h2 style={{ color: "white", fontSize: "1.8rem", fontWeight: 700, marginBottom: "6px" }}>Create Account</h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem", marginBottom: "24px" }}>Join BRN LAB and start booking classes.</p>

              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  placeholder="Password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
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
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
