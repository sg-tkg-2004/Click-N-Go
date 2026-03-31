import { useState } from "react";
import ReviewCard from "../components/common/ReviewCard";
import { REVIEWS } from "../data/appData";

const EXTRA_REVIEWS = [
  {
    name: "Kavya Nair",
    rating: 5,
    text: "Booked a dentist through ClicknGo and the experience was flawless. 10/10 would recommend to everyone!",
    date: "Feb 10, 2024",
    avatar: "KN",
  },
  {
    name: "Rohan Das",
    rating: 3,
    text: "Good concept, but the Sports & Gaming section needs more providers in my area. Hope they expand soon.",
    date: "Jan 30, 2024",
    avatar: "RD",
  },
];

export default function ReviewsPage() {
  const [rating, setRating] = useState(0);
  const [hov, setHov] = useState(0);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const allReviews = [...REVIEWS, ...EXTRA_REVIEWS];

  return (
    <div className="page" style={{ background: "var(--black)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(24px,4vw,40px) clamp(16px,4vw,48px)" }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
          Reviews & Ratings
        </div>
        <p style={{ color: "var(--gray-mid)", fontSize: 14, marginBottom: 36 }}>
          What the ClicknGo community is saying
        </p>

        <div
          className="glass-card animate-fade-up"
          style={{ padding: 24, marginBottom: 28, display: "flex", gap: 32, alignItems: "center" }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 52,
                fontWeight: 900,
                color: "var(--yellow)",
                lineHeight: 1,
              }}
            >
              4.6
            </div>
            <div className="stars" style={{ justifyContent: "center", marginTop: 6 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className="star">
                  ★
                </span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--gray-text)", marginTop: 4 }}>
              {allReviews.length} reviews
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {[5, 4, 3, 2, 1].map((n) => {
              const cnt = allReviews.filter((r) => r.rating === n).length;
              const pct = (cnt / allReviews.length) * 100;
              return (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--gray-mid)", width: 6 }}>{n}</span>
                  <span style={{ color: "#FFB800", fontSize: 12 }}>★</span>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: "rgba(255,255,255,0.07)",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "var(--yellow)",
                        borderRadius: 99,
                        transition: "width .6s",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--gray-text)", width: 14 }}>{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
          {allReviews.map((r, i) => (
            <ReviewCard key={i} r={r} i={i} />
          ))}
        </div>

        <div className="glass-card animate-fade-up" style={{ padding: 28 }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Write a Review</div>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Thank you for your review!</div>
              <div style={{ fontSize: 13, color: "var(--gray-text)" }}>
                Your feedback helps the community make better choices.
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Your Rating</label>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setHov(s)}
                      onMouseLeave={() => setHov(0)}
                      style={{
                        fontSize: 28,
                        cursor: "pointer",
                        color: s <= (hov || rating) ? "#FFB800" : "rgba(255,255,255,0.15)",
                        transition: "all .15s",
                        transform: s <= (hov || rating) ? "scale(1.2)" : "scale(1)",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Your Review</label>
                <textarea
                  className="form-input"
                  rows={4}
                  style={{ resize: "vertical" }}
                  placeholder="Share your experience..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
              <button
                className="btn btn-yellow"
                onClick={() => {
                  if (rating && text) setSubmitted(true);
                }}
              >
                Submit Review
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
