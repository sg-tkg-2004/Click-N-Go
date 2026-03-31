import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { fetchWithAuth } from "../../utils/api";

export default function ProviderDashboardPage() {
  const navigate = useNavigate();
  const { user, showToast } = useAppContext();
  
  const [services, setServices] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [newSvc, setNewSvc] = useState({ title: "", description: "", price: "", duration_minutes: 30, tags: "" });

  const [showAvailForm, setShowAvailForm] = useState(false);
  const [newAvail, setNewAvail] = useState({ start_time: "", end_time: "" });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "PROVIDER") {
      showToast("Access Denied: Providers only.");
      navigate("/");
      return;
    }
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: svcData } = await fetchWithAuth(`/services/my`);
      setServices(svcData || []);
      
      const { data: availData } = await fetchWithAuth(`/availabilities/${user.id}`);
      setAvailabilities(availData || []);
    } catch (err) {
      showToast(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateService(e) {
    e.preventDefault();
    try {
      const payload = {
        category_id: "grooming", // Hardcoded for simplicity, could be a dropdown
        title: newSvc.title,
        description: newSvc.description,
        price: Number(newSvc.price),
        duration_minutes: Number(newSvc.duration_minutes),
        tags: newSvc.tags.split(",").map(t => t.trim()).filter(Boolean)
      };
      await fetchWithAuth(`/services`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showToast("Service created successfully!");
      setShowServiceForm(false);
      setNewSvc({ title: "", description: "", price: "", duration_minutes: 30, tags: "" });
      fetchData();
    } catch (err) {
      showToast(err.message || "Failed to create service");
    }
  }

  async function handleCreateAvailability(e) {
    e.preventDefault();
    try {
      const sd = new Date(newAvail.start_time).toISOString();
      const ed = new Date(newAvail.end_time).toISOString();
      
      await fetchWithAuth(`/availabilities`, {
        method: "POST",
        body: JSON.stringify({ start_time: sd, end_time: ed })
      });
      showToast("Availability slot created!");
      setShowAvailForm(false);
      setNewAvail({ start_time: "", end_time: "" });
      fetchData();
    } catch (err) {
      // Handle the 409 Overlap specifically!
      showToast(err.message || "Failed to create slot (overlap?)");
    }
  }

  return (
    <div className="page" style={{ background: "var(--black)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(24px,4vw,40px) clamp(16px,4vw,48px)" }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          Provider Dashboard
        </div>
        <p style={{ color: "var(--gray-mid)", fontSize: 14, marginBottom: 32 }}>
          Manage your services and open booking slots.
        </p>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--gray-text)" }}>Loading DB...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            {/* SERVICES SECTION */}
            <div className="glass-card" style={{ padding: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700 }}>My Services</h3>
                <button className="btn btn-yellow" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setShowServiceForm(!showServiceForm)}>
                  {showServiceForm ? "Cancel" : "+ Add Service"}
                </button>
              </div>

              {showServiceForm && (
                <form onSubmit={handleCreateService} style={{ background: "rgba(255,255,255,0.03)", padding: 20, borderRadius: 16, marginBottom: 24, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label className="form-label">Service Title</label>
                      <input required className="form-input" value={newSvc.title} onChange={e => setNewSvc({...newSvc, title: e.target.value})} placeholder="e.g. Master Haircut" />
                    </div>
                    <div>
                      <label className="form-label">Price (₹)</label>
                      <input required type="number" className="form-input" value={newSvc.price} onChange={e => setNewSvc({...newSvc, price: e.target.value})} />
                    </div>
                    <div>
                      <label className="form-label">Duration (mins)</label>
                      <input required type="number" className="form-input" value={newSvc.duration_minutes} onChange={e => setNewSvc({...newSvc, duration_minutes: e.target.value})} />
                    </div>
                    <div>
                      <label className="form-label">Tags (comma separated)</label>
                      <input className="form-input" value={newSvc.tags} onChange={e => setNewSvc({...newSvc, tags: e.target.value})} placeholder="Hair, Styling, Man" />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="form-label">Description</label>
                      <textarea required className="form-input" value={newSvc.description} onChange={e => setNewSvc({...newSvc, description: e.target.value})} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-glass" style={{ width: "100%" }}>Save Service</button>
                </form>
              )}

              {services.length === 0 ? (
                <div style={{ color: "var(--gray-text)", fontSize: 14 }}>No services listed yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {services.map(s => (
                    <div key={s.id} style={{ padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <strong>{s.title}</strong>
                        <span style={{ color: "var(--yellow)" }}>₹{s.price}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--gray-mid)" }}>{s.description}</div>
                      <div style={{ fontSize: 12, marginTop: 8, color: "var(--gray-text)" }}>⏱ {s.duration_minutes} mins</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AVAILABILITIES SECTION */}
            <div className="glass-card" style={{ padding: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700 }}>Upcoming Slots</h3>
                <button className="btn btn-yellow" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setShowAvailForm(!showAvailForm)}>
                  {showAvailForm ? "Cancel" : "+ Add Slot"}
                </button>
              </div>

              {showAvailForm && (
                <form onSubmit={handleCreateAvailability} style={{ background: "rgba(255,255,255,0.03)", padding: 20, borderRadius: 16, marginBottom: 24, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label className="form-label">Start Time</label>
                      <input required type="datetime-local" className="form-input" value={newAvail.start_time} onChange={e => setNewAvail({...newAvail, start_time: e.target.value})} />
                    </div>
                    <div>
                      <label className="form-label">End Time</label>
                      <input required type="datetime-local" className="form-input" value={newAvail.end_time} onChange={e => setNewAvail({...newAvail, end_time: e.target.value})} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-glass" style={{ width: "100%" }}>Create Slot</button>
                </form>
              )}

              {availabilities.length === 0 ? (
                <div style={{ color: "var(--gray-text)", fontSize: 14 }}>No upcoming slots.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {availabilities.map(a => (
                    <div key={a.id} style={{ display: "flex", gap: 16, padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", fontSize: 14 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--green)", marginTop: 4 }}></div>
                      <div>
                        <div>{new Date(a.start_time).toLocaleString()} - {new Date(a.end_time).toLocaleTimeString()}</div>
                        <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 2 }}>Slot ID: {a.id}</div>
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
