import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { CATEGORIES } from "../../data/appData";
import Footer from "../../components/layout/Footer";

export default function ProviderRegisterPage() {
  const { showToast } = useAppContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", category: "", address: "", phone: "", desc: "" });
  function set(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  return (
    <div className="page" style={{ background: "var(--black)" }}>
      <div
        style={{
          position: "relative",
          padding: "64px 48px 48px",
          textAlign: "center",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 50% 100%,rgba(255,224,51,0.08),transparent 70%)",
          }}
        />
        <div style={{ position: "relative" }}>
          <span className="badge badge-yellow" style={{ marginBottom: 16, display: "inline-flex" }}>
            For Business Owners
          </span>
          <h1
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: "clamp(32px,5vw,52px)",
              fontWeight: 900,
              marginBottom: 16,
            }}
          >
            Register Your Business
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 580, margin: "0 auto 64px", padding: "0 48px" }}>
        <div className="glass-card animate-scale" style={{ padding: 36 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 99,
                  background: s <= step ? "var(--yellow)" : "rgba(255,255,255,0.1)",
                  transition: "background .4s",
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--gray-text)", marginBottom: 4 }}>Step {step} of 3</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
            {step === 1 ? "Business Details" : step === 2 ? "Service Info" : "Review & Submit"}
          </div>

          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="form-label">Business Name</label>
                <input className="form-input" placeholder="e.g. Standard Salon" value={form.name} onChange={set("name")} />
              </div>
              <div>
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={form.category}
                  onChange={set("category")}
                  style={{ background: "#fff", color: "var(--white)" }}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Address</label>
                <input className="form-input" placeholder="Street, City, State" value={form.address} onChange={set("address")} />
              </div>
              <div>
                <label className="form-label">Contact Number</label>
                <input className="form-input" placeholder="+1 (555) 000-0000" value={form.phone} onChange={set("phone")} />
              </div>
              <button className="btn btn-yellow" style={{ marginTop: 8 }} onClick={() => setStep(2)}>
                Next
              </button>
            </div>
          )}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="form-label">Business Description</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Describe your services..."
                  value={form.desc}
                  onChange={set("desc")}
                  style={{ resize: "vertical" }}
                />
              </div>
              <div>
                <label className="form-label">Working Hours</label>
                <input className="form-input" placeholder="e.g. 10:00 AM – 8:00 PM" />
              </div>
              <div>
                <label className="form-label">Services Offered</label>
                <input className="form-input" placeholder="e.g. Haircut, Styling, Beard Trim" />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="btn btn-yellow" style={{ flex: 1 }} onClick={() => setStep(3)}>
                  Next
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20,
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {[
                  ["Business", form.name || "—"],
                  ["Category", form.category || "—"],
                  ["Address", form.address || "—"],
                  ["Phone", form.phone || "—"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--gray-text)" }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setStep(2)}>
                  Back
                </button>
                <button
                  className="btn btn-yellow"
                  style={{ flex: 1 }}
                  onClick={() => {
                    showToast("Business listed. We'll review within 24 hours.");
                    navigate("/provider/dashboard");
                  }}
                >
                  Submit Listing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
