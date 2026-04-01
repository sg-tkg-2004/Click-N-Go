import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StarRating from "../components/common/StarRating";
import ReviewCard from "../components/common/ReviewCard";
import { CATEGORIES } from "../data/appData";
import { useAppContext } from "../context/AppContext";
import { fetchWithAuth } from "../utils/api";
import { normalizeLocalDateKey, todayLocalDateKey } from "../utils/dateKeys";
import { buildForwardSlotStarts } from "../utils/slotWindows";

const BASE_SLOT_MIN = 15;

function formatTimeLabel(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function buildBookableSlotStarts(sortedRows, durationMinutes) {
  return buildForwardSlotStarts(sortedRows, durationMinutes).map((slot) => ({
    ...slot,
    timeLabel: formatTimeLabel(slot.start_time),
    reason: slot.disabled ? "unavailable" : null,
  }));
}

export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast, user } = useAppContext();

  const [service, setService] = useState(null);
  const [rawAvail, setRawAvail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availLoading, setAvailLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => todayLocalDateKey());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [reviews, setReviews] = useState([]);

  const availRequestIdRef = useRef(0);

  const minDateAttr = todayLocalDateKey();

  useEffect(() => {
    async function loadService() {
      try {
        const { data: svcData } = await fetchWithAuth(`/services/${id}`);
        setService(svcData);
      } catch {
        showToast("Service not found");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }
    loadService();
  }, [id, navigate, showToast]);

  const fetchAvailability = useCallback(async () => {
    if (!service?.provider_id) return;
    const reqId = ++availRequestIdRef.current;
    setAvailLoading(true);
    try {
      const { data } = await fetchWithAuth(`/availabilities/${service.provider_id}`);
      if (reqId !== availRequestIdRef.current) return;
      setRawAvail(Array.isArray(data) ? data : []);
    } catch {
      if (reqId !== availRequestIdRef.current) return;
      showToast("Could not load availability");
      setRawAvail([]);
    } finally {
      if (reqId === availRequestIdRef.current) setAvailLoading(false);
    }
  }, [service?.provider_id, showToast]);

  useEffect(() => {
    if (service?.provider_id) fetchAvailability();
  }, [service?.provider_id, fetchAvailability]);

  useEffect(() => {
    async function loadReviews() {
      if (!service?.id) return;
      try {
        const { data } = await fetchWithAuth(`/reviews/service/${service.id}`);
        setReviews(Array.isArray(data) ? data : []);
      } catch {
        setReviews([]);
      }
    }
    loadReviews();
  }, [service?.id]);

  const durationMinutes = service?.duration_minutes || 30;
  const isProvider = user?.role === "PROVIDER";

  /** Strictly slots whose start falls on the selected local calendar day (YYYY-MM-DD from date input). */
  const slotsForDay = useMemo(() => {
    const dayRows = rawAvail.filter((a) => normalizeLocalDateKey(a.start_time) === selectedDate);
    const sorted = [...dayRows].sort(
      (a, b) => new Date(a.start_time) - new Date(b.start_time)
    );
    return buildBookableSlotStarts(sorted, durationMinutes);
  }, [rawAvail, selectedDate, durationMinutes]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate, durationMinutes, rawAvail]);

  async function handleConfirmBooking() {
    if (!selectedSlot || !service) return;
    setBookingLoading(true);
    try {
      await fetchWithAuth(`/bookings`, {
        method: "POST",
        body: JSON.stringify({
          provider_id: service.provider_id,
          service_id: service.id,
          availability_id: selectedSlot.availability_id,
          start_time: selectedSlot.start_time,
        }),
      });
      showToast("Booking successful!");
      await fetchAvailability();
      setSelectedSlot(null);
      navigate("/profile");
    } catch (err) {
      showToast(err.message || "Booking failed");
      await fetchAvailability();
      setSelectedSlot(null);
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ color: "var(--white)", textAlign: "center", padding: 100 }}>
        Loading service…
      </div>
    );
  }
  if (!service) return null;

  const cat = CATEGORIES.find((c) => c.id === service.category_id) || CATEGORIES[0];

  return (
    <div className="page" style={{ background: "var(--black)" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(20px,4vw,32px) clamp(16px,4vw,48px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
          gap: 28,
          alignItems: "start",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontSize: 13,
              color: "var(--gray-text)",
              marginBottom: 24,
            }}
          >
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
              Home
            </span>
            <span>›</span>
            <span style={{ cursor: "pointer" }} onClick={() => navigate(`/category/${cat?.id}`)}>
              {cat?.label}
            </span>
            <span>›</span>
            <span style={{ color: "var(--white)" }}>{service.title}</span>
          </div>

          <div className="glass-card animate-fade-up" style={{ marginBottom: 20 }}>
            <div
              style={{
                padding: "28px 28px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  background: cat?.bg,
                  border: `1px solid ${cat?.color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                  flexShrink: 0,
                }}
              >
                {cat?.icon ? <img src={cat.icon} alt={cat.label} width={40} /> : "✨"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
                  {service.title}
                </div>
                <StarRating
                  rating={reviews.length ? Number((reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)) : 0}
                  count={reviews.length}
                />
                <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--gray-mid)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {service.duration_minutes} mins
                  </div>
                </div>
              </div>
              {service.price > 0 && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--gray-mid)" }}>price</div>
                  <div
                    style={{
                      fontFamily: "'Playfair Display',serif",
                      fontSize: 28,
                      fontWeight: 700,
                      color: "var(--yellow)",
                    }}
                  >
                    ₹{service.price}
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 14, color: "var(--gray-mid)", lineHeight: 1.75 }}>
                {service.description || "No description provided."}
              </p>
            </div>
            {service.tags && service.tags.length > 0 && (
              <div style={{ padding: "20px 28px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                  {service.tags.map((tag) => (
                    <div key={tag} className="chip">
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-card animate-fade-up" style={{ animationDelay: ".15s", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 700 }}>Recent Reviews</div>
              <button
                className="btn btn-glass"
                style={{ fontSize: 12, padding: "6px 14px" }}
                onClick={() => navigate(`/reviews?serviceId=${service.id}`)}
              >
                View All
              </button>
            </div>
            {!reviews.length ? (
              <div style={{ fontSize: 13, color: "var(--gray-text)" }}>No reviews yet.</div>
            ) : (
              reviews.slice(0, 2).map((r, i) => (
                <ReviewCard
                  key={r.id}
                  i={i}
                  compact
                  r={{
                    avatar: (r.reviewer_name || "U")[0],
                    name: r.reviewer_name || "User",
                    rating: r.rating,
                    date: new Date(r.created_at).toLocaleDateString(),
                    text: r.comment || "",
                  }}
                />
              ))
            )}
          </div>
        </div>

        <div
          className="glass-card animate-fade-up"
          style={{ animationDelay: ".1s", position: "sticky", top: 80, overflow: "hidden" }}
        >
          <div
            style={{
              padding: "18px 20px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>Pick a date & time</div>
            <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 2 }}>
              Slots align to {BASE_SLOT_MIN}-minute blocks · {durationMinutes} min service
            </div>
          </div>

          <div style={{ padding: "16px 20px" }}>
            <label className="form-label" style={{ display: "block", marginBottom: 8 }}>
              Date
            </label>
            <input
              type="date"
              className="form-input"
              min={minDateAttr}
              value={selectedDate}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                setSelectedDate(v);
              }}
            />
            <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 8 }}>
              Showing slots for <strong>{selectedDate}</strong> (your local date)
            </div>
          </div>

          <div style={{ padding: "0 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {isProvider ? (
              <div style={{ fontSize: 13, color: "var(--gray-text)", padding: "12px 0" }}>
                Providers cannot book services. Use Manage Services to update this listing.
              </div>
            ) : availLoading ? (
              <div style={{ fontSize: 13, color: "var(--gray-text)", padding: "12px 0" }}>Loading slots…</div>
            ) : slotsForDay.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--gray-text)", padding: "12px 0" }}>
                No slots available for the selected date.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: 10,
                }}
              >
                {slotsForDay.map((slot) => {
                  const sel =
                    selectedSlot &&
                    selectedSlot.availability_id === slot.availability_id &&
                    selectedSlot.start_time === slot.start_time;
                  const isDisabled = slot.disabled;
                  return (
                    <button
                      key={`${slot.availability_id}-${slot.start_time}`}
                      type="button"
                      className={`slot-btn${sel ? " slot-btn-selected" : ""}${isDisabled ? " slot-btn-disabled" : ""}`}
                      disabled={isDisabled}
                      onClick={() => !isDisabled && setSelectedSlot(slot)}
                    >
                      {slot.timeLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ padding: "16px 20px 20px" }}>
            {selectedSlot && !selectedSlot.disabled && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  fontSize: 13,
                  color: "var(--gray-mid)",
                }}
              >
                <span>
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} ·{" "}
                  {selectedSlot.timeLabel}
                </span>
                <span style={{ fontWeight: 700, color: "var(--yellow)", fontSize: 15 }}>₹{service.price}</span>
              </div>
            )}
            <button
              className="btn btn-yellow"
              style={{
                width: "100%",
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                opacity: isProvider || (selectedSlot && !selectedSlot.disabled && !bookingLoading) ? 1 : 0.4,
                cursor: isProvider || (selectedSlot && !selectedSlot.disabled && !bookingLoading) ? "pointer" : "not-allowed",
              }}
              disabled={(!isProvider && (!selectedSlot || selectedSlot.disabled || bookingLoading || availLoading))}
              onClick={() => {
                if (isProvider) {
                  navigate("/provider/dashboard");
                  return;
                }
                handleConfirmBooking();
              }}
            >
              {isProvider ? "Manage Services" : bookingLoading ? "Securing slot…" : selectedSlot ? "Book Now" : "Select a time"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
