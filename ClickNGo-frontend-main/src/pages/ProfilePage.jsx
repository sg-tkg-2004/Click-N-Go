import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { RECENT_BOOKINGS } from "../data/appData";

const DEFAULT_USER = {
  name: "Sarah Anderson",
  email: "sarah.anderson@email.com",
  phone: "+91 999-999-9999",
  address: "SGSITS Indore",
  joined: "2026",
};

export default function ProfilePage() {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();
  const u = user || DEFAULT_USER;

  const [activeTab, setActiveTab] = useState("bookings");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: u.name,
    email: u.email,
    phone: u.phone,
    address: u.address,
  });

  useEffect(() => {
    const curr = user || DEFAULT_USER;
    setEditForm({ name: curr.name, email: curr.email, phone: curr.phone, address: curr.address });
  }, [user]);

  function startEdit() {
    setEditForm({
      name: (user || u).name,
      email: (user || u).email,
      phone: (user || u).phone,
      address: (user || u).address,
    });
    setEditing(true);
  }

  function saveEdit() {
    setUser({
      ...(user || u),
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      address: editForm.address,
    });
    setEditing(false);
  }

  function setField(k) {
    return (e) => setEditForm((f) => ({ ...f, [k]: e.target.value }));
  }

  return (
    <div className="page" style={{ background: "var(--black)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "clamp(20px,4vw,32px) clamp(16px,4vw,48px)" }}>
        <div
          className="glass-card animate-fade-up"
          style={{
            padding: 28,
            marginBottom: 24,
            display: "flex",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "linear-gradient(135deg,var(--black3),#2a2a4a)",
              border: "2.5px solid rgba(255,224,51,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              color: "var(--yellow)",
              flexShrink: 0,
            }}
          >
            {(user || u).name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
              {(user || u).name}
            </div>
            <div style={{ fontSize: 13, color: "var(--gray-mid)", marginBottom: 3 }}>
              {(user || u).email} · {(user || u).phone}
            </div>
            <div style={{ fontSize: 13, color: "var(--gray-mid)" }}>{(user || u).address}</div>
          </div>
          <button
            className="btn btn-glass"
            style={{ fontSize: 13, padding: "9px 20px", flexShrink: 0 }}
            onClick={startEdit}
          >
            Edit Profile
          </button>
        </div>

        {/* Edit Profile - large full-width form */}
        {editing && (
          <div
            className="glass-card animate-fade-in"
            style={{
              padding: "clamp(32px,6vw,64px)",
              marginBottom: 40,
              width: "100%",
              maxWidth: "100%",
              minHeight: 420,
            }}
          >
            <div style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, marginBottom: 36 }}>
              Edit Profile
            </div>
            <div
              style={{
                display: "grid",
                gap: 28,
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                maxWidth: 960,
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label" style={{ fontSize: 14 }}>Full Name</label>
                <input
                  className="form-input"
                  style={{ padding: "18px 24px", fontSize: 17 }}
                  value={editForm.name}
                  onChange={setField("name")}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 14 }}>Email</label>
                <input
                  className="form-input"
                  style={{ padding: "18px 24px", fontSize: 17 }}
                  type="email"
                  value={editForm.email}
                  onChange={setField("email")}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 14 }}>Phone</label>
                <input
                  className="form-input"
                  style={{ padding: "18px 24px", fontSize: 17 }}
                  value={editForm.phone}
                  onChange={setField("phone")}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label" style={{ fontSize: 14 }}>Address</label>
                <textarea
                  className="form-input"
                  style={{ padding: "18px 24px", fontSize: 17, minHeight: 100, resize: "vertical" }}
                  value={editForm.address}
                  onChange={setField("address")}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 36, flexWrap: "wrap" }}>
              <button className="btn btn-yellow" style={{ padding: "16px 32px", fontSize: 16 }} onClick={saveEdit}>
                Save Changes
              </button>
              <button className="btn btn-glass" style={{ padding: "16px 28px" }} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Total Bookings", val: "12", icon: "TB" },
            { label: "Completed", val: "10", icon: "CP" },
            { label: "Cancelled", val: "2", icon: "CN" },
            { label: "Member Since", val: (user || u).joined, icon: "MS" },
          ].map((s, i) => (
            <div
              key={i}
              className="glass-card animate-fade-up"
              style={{ padding: 18, textAlign: "center", animationDelay: `${i * 0.08}s` }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "var(--yellow)" }}>
                {s.val}
              </div>
              <div style={{ fontSize: 11, color: "var(--gray-text)", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 20,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 12,
            padding: 4,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {["bookings", "saved", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "9px 0",
                border: "none",
                borderRadius: 9,
                background: activeTab === tab ? "var(--yellow)" : "transparent",
                color: activeTab === tab ? "var(--black)" : "var(--gray-mid)",
                fontWeight: activeTab === tab ? 700 : 500,
                fontSize: 13,
                textTransform: "capitalize",
                transition: "all .2s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "bookings" && (
          <div className="glass-card animate-fade-in" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 700 }}>Recent Bookings</div>
              <span style={{ fontSize: 12, color: "var(--gray-text)" }}>View all</span>
            </div>
            {RECENT_BOOKINGS.map((b, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 24px",
                  borderBottom: i < RECENT_BOOKINGS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  transition: "background .2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {b.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{b.service}</div>
                  <div style={{ fontSize: 12, color: "var(--gray-text)" }}>{b.provider}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "var(--gray-mid)" }}>{b.date}</div>
                  <span
                    className={`badge ${b.status === "completed" ? "badge-green" : "badge-red"}`}
                    style={{ marginTop: 4 }}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="glass-card animate-fade-in" style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>SV</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No saved providers yet</div>
            <div style={{ fontSize: 13, color: "var(--gray-text)", marginBottom: 20 }}>
              Bookmark your favourite services for quick re-booking
            </div>
            <button
              className="btn btn-yellow"
              style={{ fontSize: 13, padding: "10px 24px" }}
              onClick={() => navigate("/category/grooming")}
            >
              Explore Services
            </button>
          </div>
        )}

        {activeTab === "settings" && !editing && (
          <div className="glass-card animate-fade-in" style={{ padding: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Account Settings</div>
            <p style={{ fontSize: 14, color: "var(--gray-mid)", marginBottom: 16 }}>
              Use the Edit Profile button above to update your details. Changes persist until you refresh the page.
            </p>
            <button className="btn btn-glass" onClick={startEdit}>
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
