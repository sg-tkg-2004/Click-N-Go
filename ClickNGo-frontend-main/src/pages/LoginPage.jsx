import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function LoginPage() {
  const { loginFn, showToast } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !pass) {
      showToast("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      await loginFn(email, pass);
      showToast("Login successful. Welcome back!");
      navigate("/");
    } catch (error) {
      showToast(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="page"
      style={{
        background: "var(--black)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          top: "-10%",
          right: "-5%",
          background: "rgba(255,224,51,0.06)",
          borderRadius: "50%",
          filter: "blur(100px)",
          animation: "liquidBlob 10s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 350,
          height: 350,
          bottom: "5%",
          left: "-5%",
          background: "rgba(155,89,182,0.08)",
          borderRadius: "50%",
          filter: "blur(80px)",
          animation: "liquidBlob 8s ease-in-out 3s infinite",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: 36,
          maxWidth: 980,
          width: "100%",
          alignItems: "center",
        }}
      >
        <div className="animate-fade-up" style={{ padding: "20px 0" }}>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: "clamp(40px,5vw,56px)",
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 20,
            }}
          >
            Welcome
            <br />
            back to
            <br />
            <span style={{ color: "var(--yellow)" }}>ClicknGo</span>
          </div>
          <p style={{ fontSize: 15, color: "var(--gray-mid)", lineHeight: 1.7 }}>
            Your trusted platform for booking local services — from grooming to gaming, healthcare to home.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}>
            {[
              { icon: "GR", text: "Grooming" },
              { icon: "RE", text: "Real Estate" },
              { icon: "HC", text: "HealthCare" },
              { icon: "SG", text: "Sports & Gaming" },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 14,
                  color: "var(--gray-mid)",
                  animationDelay: `${0.1 + i * 0.08}s`,
                }}
                className="animate-fade-up"
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: "var(--yellow-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  {item.icon}
                </span>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card animate-scale" style={{ padding: 36 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
            Login Now
          </h2>
          <p style={{ fontSize: 13, color: "var(--gray-text)", marginBottom: 28 }}>Enter your details to continue</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="form-label">Email</label>
              <input
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </div>
            <div style={{ textAlign: "right", marginTop: -8 }}>
              <span style={{ fontSize: 12, color: "var(--yellow)", cursor: "pointer" }}>Forgot Password?</span>
            </div>
            <button className="btn btn-yellow" style={{ width: "100%", borderRadius: 12, padding: 14 }} onClick={handleLogin} disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
            </button>
            <div style={{ textAlign: "center", fontSize: 13, color: "var(--gray-text)" }}>
              Have no account?{" "}
              <span
                style={{ color: "var(--yellow)", cursor: "pointer", fontWeight: 600 }}
                onClick={() => navigate("/signup")}
              >
                Create Now
              </span>
            </div>
            <div className="divider">or</div>
            <button className="social-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Continue with Apple
            </button>
            <button className="social-btn">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
