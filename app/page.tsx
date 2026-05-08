import Link from "next/link";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: "white",
          maxWidth: "600px",
          padding: "40px",
        }}
      >
        <h1 style={{ fontSize: "48px", marginBottom: "20px" }}>FitLife</h1>
        <p style={{ fontSize: "18px", marginBottom: "40px", opacity: 0.9 }}>
          Track your training, nutrition, and recovery all in one place.
        </p>

        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <Link href="/auth/login">
            <button className="btn btn-primary" style={{ fontSize: "16px" }}>
              Log In
            </button>
          </Link>
          <Link href="/auth/signup">
            <button className="btn btn-secondary" style={{ fontSize: "16px" }}>
              Sign Up
            </button>
          </Link>
        </div>

        <p
          style={{
            marginTop: "60px",
            fontSize: "14px",
            opacity: 0.8,
          }}
        >
          Start your fitness journey today
        </p>
      </div>
    </div>
  );
}
