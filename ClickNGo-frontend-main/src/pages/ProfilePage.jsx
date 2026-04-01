import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { fetchWithAuth } from "../utils/api";

export default function ProfilePage() {
  const { user, setUser, logoutFn, showToast, loadCurrentUser } = useAppContext();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: "" });

  const pending = pendingReviews[0] || null;

  useEffect(() => {
    if (!user) return;
    setEditForm({ name: user.name || "", phone: user.phone || "" });
  }, [user]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: b }, { data: d }, { data: p }] = await Promise.all([
        fetchWithAuth("/bookings/my"),
        fetchWithAuth("/dashboard/me"),
        fetchWithAuth("/reviews/pending/me"),
      ]);
      setBookings(Array.isArray(b) ? b : []);
      setDashboard(d || null);
      setPendingReviews(Array.isArray(p) ? p : []);
    } catch {
      showToast("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function setField(k) {
    return (e) => setEditForm((prev) => ({ ...prev, [k]: e.target.value }));
  }

  async function saveProfile() {
    if (!editForm.name.trim()) return showToast("Name is required");
    setSaving(true);
    try {
      const { data } = await fetchWithAuth("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: editForm.name.trim(),
          phone: editForm.phone.trim(),
        }),
      });
      setUser(data.user);
      await loadCurrentUser();
      setEditing(false);
      showToast("Profile updated");
    } catch (e) {
      showToast(e.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  async function submitMandatoryReview() {
    if (!pending) return;
    if (!reviewForm.rating) return showToast("Please select a rating");
    if (!reviewForm.comment.trim()) return showToast("Please write your feedback");
    setReviewSubmitting(true);
    try {
      await fetchWithAuth("/reviews", {
        method: "POST",
        body: JSON.stringify({
          booking_id: pending.booking_id,
          rating: reviewForm.rating,
          comment: reviewForm.comment.trim(),
        }),
      });
      setReviewForm({ rating: 0, comment: "" });
      showToast("Review submitted");
      await loadAll();
    } catch (e) {
      showToast(e.message || "Could not submit review");
    } finally {
      setReviewSubmitting(false);
    }
  }

  const summary = dashboard?.bookingSummary || { total: 0, completed: 0, cancelled: 0, active: 0 };

  return (
    <div className="page" style={{ background: "var(--black)" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "clamp(20px,4vw,32px) clamp(16px,4vw,48px)" }}>
        <div className="glass-card animate-fade-up" style={{ padding: 24, marginBottom: 18, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,var(--black3),#2a2a4a)", border: "2px solid rgba(255,224,51,0.35)", display: "grid", placeItems: "center", color: "var(--yellow)", fontWeight: 800, fontSize: 24 }}>
            {(user?.name || "U")[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700 }}>{user?.name || "Guest"}</div>
            <div style={{ fontSize: 13, color: "var(--gray-mid)" }}>{user?.email} {user?.phone ? `· ${user.phone}` : ""}</div>
          </div>
          <button className="btn btn-glass" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => setEditing(true)}>Edit Profile</button>
          {user && <button className="btn btn-glass" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => { logoutFn(); navigate("/login"); }}>Logout</button>}
        </div>

        {editing && (
          <div className="glass-card animate-fade-in" style={{ maxWidth: 520, padding: 20, marginBottom: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Edit profile</div>
            <div style={{ display: "grid", gap: 10 }}>
              <input className="form-input" placeholder="Full name" value={editForm.name} onChange={setField("name")} />
              <input className="form-input" placeholder="Phone number" value={editForm.phone} onChange={setField("phone")} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn btn-yellow" disabled={saving} onClick={saveProfile}>{saving ? "Saving…" : "Save"}</button>
              <button className="btn btn-glass" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 18 }}>
          {[
            { label: "Total bookings", val: summary.total },
            { label: "Completed", val: summary.completed },
            { label: "Cancelled", val: summary.cancelled },
            { label: "Pending reviews", val: dashboard?.pendingReviews || 0 },
          ].map((s) => (
            <div key={s.label} className="glass-card" style={{ padding: 16, textAlign: "center" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: "var(--yellow)" }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "var(--gray-text)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="glass-card animate-fade-in">
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 700 }}>Recent bookings</div>
          {loading ? (
            <div style={{ padding: 20, color: "var(--gray-text)" }}>Loading…</div>
          ) : !bookings.length ? (
            <div style={{ padding: 20, color: "var(--gray-text)" }}>No bookings found yet.</div>
          ) : (
            bookings.map((b, i) => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "14px 20px", borderBottom: i < bookings.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{b.service_title}</div>
                  <div style={{ fontSize: 12, color: "var(--gray-text)" }}>{b.provider_name}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--gray-mid)" }}>{new Date(b.start_time).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {pending && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div className="glass-card" style={{ width: "min(92vw, 520px)", padding: 22 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Review required</div>
            <div style={{ fontSize: 13, color: "var(--gray-mid)", marginBottom: 16 }}>
              Please review your completed booking for <strong>{pending.service_title}</strong> to continue.
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" className="btn btn-glass" style={{ padding: "6px 10px", background: reviewForm.rating >= s ? "var(--yellow)" : undefined, color: reviewForm.rating >= s ? "var(--black)" : undefined }} onClick={() => setReviewForm((f) => ({ ...f, rating: s }))}>
                  {s}★
                </button>
              ))}
            </div>
            <textarea className="form-input" rows={4} placeholder="Share your feedback" value={reviewForm.comment} onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))} />
            <button className="btn btn-yellow" style={{ width: "100%", marginTop: 12 }} disabled={reviewSubmitting} onClick={submitMandatoryReview}>
              {reviewSubmitting ? "Submitting…" : "Submit review"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
