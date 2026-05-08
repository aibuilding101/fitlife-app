import Link from "next/link";

export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(125,240,168,0.07) 0%, transparent 60%), #0a0e0c",
      padding: "40px 20px",
      textAlign: "center",
    }}>
      <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8a9590", marginBottom: "20px" }}>
        Your fitness OS
      </p>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(48px, 8vw, 76px)", fontWeight: 600, letterSpacing: "-2px", color: "#e8efea", lineHeight: 1.05, marginBottom: "20px" }}>
        FitLife<span style={{ color: "#7df0a8" }}>.</span>
      </h1>
      <p style={{ fontSize: "16px", color: "#8a9590", maxWidth: "420px", lineHeight: 1.6, marginBottom: "44px" }}>
        Track training, nutrition, and recovery — all in one elegant place.
      </p>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <Link href="/auth/login">
          <button className="btn btn-primary" style={{ fontSize: "14px", padding: "11px 28px" }}>Log In</button>
        </Link>
        <Link href="/auth/signup">
          <button className="btn btn-secondary" style={{ fontSize: "14px", padding: "11px 28px" }}>Sign Up</button>
        </Link>
      </div>
    </div>
  );
}
