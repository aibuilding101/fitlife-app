"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function Navbar({ userName }: { userName: string }) {
  const router = useRouter();

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div style={{ background: "white", borderBottom: "1px solid #e0e0e0", padding: "20px" }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>FitLife</h1>
        <div>
          <span style={{ marginRight: "20px", color: "#666" }}>Hola {userName}</span>
          <button className="btn btn-secondary" onClick={handleLogOut}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
