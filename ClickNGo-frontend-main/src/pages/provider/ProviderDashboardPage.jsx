import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { fetchWithAuth } from "../../utils/api";

export default function ProviderDashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useAppContext();

  const [services, setServices] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [{ data: svcData }, { data: metricsData }] = await Promise.all([
        fetchWithAuth(`/services/my`),
        fetchWithAuth(`/dashboard/provider`),
      ]);
      setServices(svcData || []);
      setMetrics(metricsData || null);
    } catch (err) {
      showToast(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ background: "var(--black)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(24px,4vw,40px) clamp(16px,4vw,48px)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12, alignItems: "center" }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 800, flex: 1 }}>
            Provider Dashboard
          </div>
          <button
            type="button"
            className="btn btn-glass"
            style={{ fontSize: 13, padding: "9px 18px" }}
            onClick={() => navigate("/provider/availability")}
          >
            Manage availability
          </button>
        </div>
        <p style={{ color: "var(--gray-mid)", fontSize: 14, marginBottom: 32 }}>
          Create services, then add open booking slots.
        </p>
        {metrics && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 20 }}>
            {[
              ["Total bookings", metrics.totalBookings],
              ["Completed", metrics.completedBookings],
              ["Pending", metrics.pendingBookings],
              ["Revenue", `₹${Number(metrics.totalRevenue || 0).toFixed(2)}`],
              ["Services", metrics.totalServicesOffered],
            ].map(([label, value]) => (
              <div key={label} className="glass-card" style={{ padding: 14 }}>
                <div style={{ fontSize: 12, color: "var(--gray-text)" }}>{label}</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "var(--yellow)" }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gray-text)" }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div className="glass-card" style={{ padding: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700 }}>My Services</h3>
                <button
                  type="button"
                  className="btn btn-yellow"
                  style={{ padding: "8px 16px", fontSize: 13 }}
                  onClick={() => navigate("/provider/service/create")}
                >
                  + Add service
                </button>
              </div>

              {services.length === 0 ? (
                <div style={{ color: "var(--gray-text)", fontSize: 14 }}>No services listed yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {services.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/provider/services/${s.id}`)}
                        style={{ float: "right", border: "none", background: "transparent", color: "var(--gray-text)", cursor: "pointer" }}
                      >
                        Manage
                      </button>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <strong>{s.title}</strong>
                        <span style={{ color: "var(--yellow)" }}>₹{s.price}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--gray-mid)" }}>{s.description}</div>
                      <div style={{ fontSize: 12, marginTop: 8, color: "var(--gray-text)" }}>
                        ⏱ {s.duration_minutes} mins
                      </div>
                      {s.location_address && (
                        <div style={{ fontSize: 12, marginTop: 4, color: "var(--gray-text)" }}>
                          📍 {s.location_address}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
