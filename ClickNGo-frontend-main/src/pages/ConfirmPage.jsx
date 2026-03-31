import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PROVIDERS } from "../data/appData";

export default function ConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const providerId = searchParams.get("providerId");
  const time = searchParams.get("time");
  const service = searchParams.get("service");

  let provider = null;
  for (const list of Object.values(PROVIDERS)) {
    const f = list.find((p) => p.id === parseInt(providerId, 10));
    if (f) {
      provider = f;
      break;
    }
  }
  const bookingId = "CNG" + Math.floor(Math.random() * 900000 + 100000);

  useEffect(() => {
    const el = document.getElementById("confetti-wrap");
    if (!el) return;
    for (let i = 0; i < 60; i++) {
      const d = document.createElement("div");
      const colors = ["#FFE033", "#22c55e", "#3b82f6", "#ef4444", "#fff"];
      d.style.cssText = `
        position:absolute;
        width:${4 + Math.random() * 6}px;height:${8 + Math.random() * 8}px;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        left:${Math.random() * 100}%;top:-10px;
        border-radius:2px;
        animation:fall ${1.5 + Math.random() * 2}s ${Math.random() * 1}s linear both;
      `;
      el.appendChild(d);
    }
  }, []);

  return (
    <div
      className="page"
      style={{
        background: "var(--black)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
      }}
    >
      <style>{`@keyframes fall{to{transform:translateY(100vh) rotate(360deg);opacity:0;}}`}</style>
      <div
        id="confetti-wrap"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      />
      <div
        className="glass-card animate-scale"
        style={{ maxWidth: 480, width: "100%", padding: 48, textAlign: "center" }}
      >
        <div
          className="check-anim"
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "var(--green-dim)",
            border: "2px solid var(--green)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            margin: "0 auto 28px",
          }}
        >
          ✓
        </div>
        <h2
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 8,
          }}
        >
          Booking Confirmed!
        </h2>
        <p style={{ color: "var(--gray-mid)", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
          Your appointment has been booked successfully. A confirmation has been sent to your email and phone.
        </p>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: 20,
            marginBottom: 28,
            textAlign: "left",
          }}
        >
          {[
            ["Provider", provider?.name || "Standard Salon"],
            ["Service", service || "Hair-cut"],
            ["Time", time || "—"],
            ["Booking ID", bookingId],
            ["Status", "Confirmed"],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--gray-text)" }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: k === "Status" ? "var(--green)" : "var(--white)" }}>
                {v}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn btn-yellow" onClick={() => navigate("/profile")}>
            View Bookings
          </button>
          <button className="btn btn-glass" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
