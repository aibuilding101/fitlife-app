"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LogIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: logInError } = await supabase.auth.signInWithPassword({ email, password });
      if (logInError) throw logInError;
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Error logging in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">FitLife<span>.</span></div>
        <p className="auth-subtitle">Welcome back</p>

        <form onSubmit={handleLogIn}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" />
          </div>
          <div className="form-group" style={{ marginBottom: "24px" }}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Your password" />
          </div>
          {error && <div className="error" style={{ marginBottom: "12px" }}>{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
