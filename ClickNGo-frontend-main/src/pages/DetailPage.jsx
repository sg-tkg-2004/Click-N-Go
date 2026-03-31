import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StarRating from "../components/common/StarRating";
import ReviewCard from "../components/common/ReviewCard";
import { CATEGORIES, REVIEWS, MONTHS, DAYS_SHORT } from "../data/appData";
import { useAppContext } from "../context/AppContext";
import { fetchWithAuth } from "../utils/api";

export default function DetailPage() {
  const { id } = useParams(); // This is now service_id
  const navigate = useNavigate();
  const { location, showToast } = useAppContext();

  const [service, setService] = useState(null);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selDate, setSelDate] = useState(null);
  const [selAvail, setSelAvail] = useState(null); // stores the full availability object
  
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: svcData } = await fetchWithAuth(`/services/${id}`);
        setService(svcData);
        
        // Use the provider_id from the service to fetch all their open slots
        if (svcData && svcData.provider_id) {
          const { data: availData } = await fetchWithAuth(`/availabilities/${svcData.provider_id}`);
          
          // Map backend slots to calendar-friendly format
          // Backend slot: { id, start_time, end_time }
          const mapped = (availData || []).map(a => {
            const st = new Date(a.start_time);
            return {
              ...a,
              dateKey: st.toLocaleDateString('en-CA'), // YYYY-MM-DD
              timeStr: st.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            };
          });
          setAvailabilities(mapped);
        }
      } catch (error) {
        showToast("Service not found");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, navigate, showToast]);

  if (loading) return <div className="page" style={{ color: "white", textAlign: "center", padding: 100 }}>Loading Service...</div>;
  if (!service) return null;

  const cat = CATEGORIES.find((c) => c.id === service.category_id) || CATEGORIES[0];

  function changeMonth(d) {
    let m = calMonth + d, y = calYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setCalMonth(m);
    setCalYear(y);
    setSelDate(null);
    setSelAvail(null);
  }

  async function handleConfirmBooking() {
    if (!selAvail) return;
    setBookingLoading(true);
    try {
      await fetchWithAuth(`/bookings`, {
        method: "POST",
        body: JSON.stringify({
          provider_id: service.provider_id,
          service_id: service.id,
          availability_id: selAvail.id
        })
      });
      showToast("Booking successful! Wait for provider confirmation.");
      // Redirect to a success page or profile
      navigate("/profile");
    } catch (err) {
      if (err.message.includes("locked")) {
         showToast("Sorry, this slot is currently locked or just booked by someone else!");
      } else {
         showToast(err.message || "Booking failed");
      }
      
      // Refresh availabilities to reflect the taken slot
      const { data: availData } = await fetchWithAuth(`/availabilities/${service.provider_id}`);
      const mapped = (availData || []).map(a => {
        const st = new Date(a.start_time);
        return {
          ...a,
          dateKey: st.toLocaleDateString('en-CA'),
          timeStr: st.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        };
      });
      setAvailabilities(mapped);
      setSelAvail(null);
    } finally {
      setBookingLoading(false);
    }
  }

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  // Get slots for Selected Date
  const selDateKey = selDate ? selDate.toLocaleDateString('en-CA') : null;
  const currentSlots = availabilities.filter(a => a.dateKey === selDateKey);
  const hasAnySlots = currentSlots.length > 0;

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
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--gray-text)", marginBottom: 24 }}>
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/")}>Home</span>
            <span>›</span>
            <span style={{ cursor: "pointer" }} onClick={() => navigate(`/category/${cat?.id}`)}>{cat?.label}</span>
            <span>›</span>
            <span style={{ color: "var(--white)" }}>{service.title}</span>
          </div>

          <div className="glass-card animate-fade-up" style={{ marginBottom: 20 }}>
            <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, background: cat?.bg, border: `1px solid ${cat?.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0 }}>
                {cat?.icon ? <img src={cat.icon} alt={cat.label} width={40} /> : "✨"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
                  {service.title}
                </div>
                <StarRating rating={4.5} count={12} />
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
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "var(--yellow)" }}>
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
                    <div key={tag} className="chip">{tag}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-card animate-fade-up" style={{ animationDelay: ".15s", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 700 }}>Recent Reviews</div>
              <button className="btn btn-glass" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => navigate("/reviews")}>
                View All
              </button>
            </div>
            {REVIEWS.slice(0, 2).map((r, i) => <ReviewCard key={i} r={r} i={i} compact />)}
          </div>
        </div>

        <div className="glass-card animate-fade-up" style={{ animationDelay: ".1s", position: "sticky", top: 80, overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Pick a Date & Time</div>
            <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 2 }}>Real-time availability · Instant confirmation</div>
          </div>

          <div style={{ padding: "16px 16px 8px" }}>
            <div className="cal-nav">
              <button className="cal-arrow" disabled={isCurrentMonth} onClick={() => changeMonth(-1)}>‹</button>
              <div className="cal-month-label">{MONTHS[calMonth]} {calYear}</div>
              <button className="cal-arrow" onClick={() => changeMonth(1)}>›</button>
            </div>

            <div className="cal-grid">
              {DAYS_SHORT.map((d) => <div key={d} className="cal-hdr">{d}</div>)}
              {Array(firstDay).fill(null).map((_, i) => <div key={"e" + i} className="cal-day cal-empty" />)}
              {Array(daysInMonth).fill(null).map((_, i) => {
                const d = i + 1;
                const date = new Date(calYear, calMonth, d);
                const isPast = date < today;
                const isToday = date.getTime() === today.getTime();
                const isSel = selDate && date.getTime() === selDate.getTime();
                
                const dKey = date.toLocaleDateString('en-CA');
                const hasSl = !isPast && availabilities.some(a => a.dateKey === dKey);
                
                let cls = "cal-day";
                if (isPast) cls += " cal-past";
                if (isToday) cls += " cal-today";
                if (isSel) cls += " cal-selected";
                if (hasSl) cls += " cal-has-slots";
                return (
                  <div key={d} className={cls} onClick={() => !isPast && (setSelDate(date), setSelAvail(null))}>
                    {d}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 14, padding: "6px 4px 12px", justifyContent: "center" }}>
              {[["var(--green)", "Available"], ["var(--yellow)", "Selected"], ["rgba(255,255,255,0.2)", "Past"]].map(([c, l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--gray-text)" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
                  {l}
                </div>
              ))}
            </div>
          </div>

          {selDate && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "16px 20px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-mid)", marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                <span>Available slots</span>
                <span style={{ background: "rgba(255,255,255,0.06)", padding: "2px 10px", borderRadius: 999, fontSize: 12 }}>
                  {selDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              {!hasAnySlots ? (
                <div style={{ textAlign: "center", padding: "16px 0", fontSize: 13, color: "var(--gray-text)" }}>
                  Provider has no open slots on this day.
                </div>
              ) : (
                <div className="time-grid">
                  {currentSlots.map((s, i) => (
                    <div
                      key={s.id}
                      className={`time-slot ${selAvail?.id === s.id ? " selected" : ""}`}
                      onClick={() => setSelAvail(s)}
                    >
                      {s.timeStr}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ padding: "16px 20px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {selDate && selAvail && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, fontSize: 13, color: "var(--gray-mid)" }}>
                <span>
                  {selDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {selAvail.timeStr}
                </span>
                <span style={{ fontWeight: 700, color: "var(--yellow)", fontSize: 15 }}>₹{service.price}</span>
              </div>
            )}
            <button
              className="btn btn-yellow"
              style={{
                width: "100%", borderRadius: 12, padding: 14, fontSize: 14,
                opacity: selAvail && !bookingLoading ? 1 : 0.4,
                cursor: selAvail && !bookingLoading ? "pointer" : "not-allowed",
              }}
              disabled={!selAvail || bookingLoading}
              onClick={handleConfirmBooking}
            >
              {bookingLoading ? "Securing Slot..." : selAvail ? "Confirm Booking" : "Select date & time"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
