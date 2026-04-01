import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { fetchWithAuth } from "../../utils/api";

export default function ProviderDashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useAppContext();

  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [newSvc, setNewSvc] = useState({
    category_id: "",
    title: "",
    description: "",
    price: "",
    duration_minutes: 30,
    tags: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: svcData } = await fetchWithAuth(`/services/my`);
      setServices(svcData || []);

      const { data: catData } = await fetchWithAuth(`/services/categories`);
      setCategories(catData || []);
    } catch (err) {
      showToast(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateService(e) {
    e.preventDefault();
    try {
      const tagStr = (newSvc.tags || "").trim();
      const tags = tagStr ? tagStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const payload = {
        category_id: newSvc.category_id,
        title: newSvc.title,
        description: newSvc.description,
        price: Number(newSvc.price),
        duration_minutes: Number(newSvc.duration_minutes),
        tags,
      };
      await fetchWithAuth(`/services`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast("Service created successfully!");
      setShowServiceForm(false);
      setNewSvc({
        category_id: "",
        title: "",
        description: "",
        price: "",
        duration_minutes: 30,
        tags: "",
      });
      await fetchData();
      navigate("/provider/availability");
    } catch (err) {
      showToast(err.message || "Failed to create service");
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

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gray-text)" }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div className="glass-card" style={{ padding: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700 }}>My Services</h3>
                <button
                  className="btn btn-yellow"
                  style={{ padding: "8px 16px", fontSize: 13 }}
                  onClick={() => setShowServiceForm(!showServiceForm)}
                >
                  {showServiceForm ? "Cancel" : "+ Add Service"}
                </button>
              </div>

              {showServiceForm && (
                <form
                  onSubmit={handleCreateService}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    padding: 20,
                    borderRadius: 16,
                    marginBottom: 24,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label className="form-label">Category</label>
                      <select
                        required
                        className="form-input"
                        value={newSvc.category_id}
                        onChange={(e) => setNewSvc({ ...newSvc, category_id: e.target.value })}
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Service Title</label>
                      <input
                        required
                        className="form-input"
                        value={newSvc.title}
                        onChange={(e) => setNewSvc({ ...newSvc, title: e.target.value })}
                        placeholder="e.g. Master Haircut"
                      />
                    </div>
                    <div>
                      <label className="form-label">Price (₹)</label>
                      <input
                        required
                        type="number"
                        className="form-input"
                        value={newSvc.price}
                        onChange={(e) => setNewSvc({ ...newSvc, price: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">Service Time (in minutes)</label>
                      <input
                        required
                        type="number"
                        step={15}
                        min={15}
                        className="form-input"
                        value={newSvc.duration_minutes}
                        onChange={(e) => setNewSvc({ ...newSvc, duration_minutes: e.target.value })}
                      />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="form-label">Services Offered</label>
                      <input
                        className="form-input"
                        value={newSvc.tags}
                        onChange={(e) => setNewSvc({ ...newSvc, tags: e.target.value })}
                        placeholder="Haircut, Beard, Styling"
                      />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="form-label">Description</label>
                      <textarea
                        required
                        className="form-input"
                        value={newSvc.description}
                        onChange={(e) => setNewSvc({ ...newSvc, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-glass" style={{ width: "100%" }}>
                    Save Service
                  </button>
                </form>
              )}

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
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <strong>{s.title}</strong>
                        <span style={{ color: "var(--yellow)" }}>₹{s.price}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--gray-mid)" }}>{s.description}</div>
                      <div style={{ fontSize: 12, marginTop: 8, color: "var(--gray-text)" }}>
                        ⏱ {s.duration_minutes} mins
                      </div>
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
