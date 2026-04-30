import { useState, useEffect } from "react";
import { B } from "../../lib/brand.js";
import { getWeeklyReviewItems } from "../../lib/spacedRepetition.js";
import AssessmentModule from "./AssessmentModule.jsx";

export default function WeeklyReview({ userId }) {
  const [items, setItems] = useState([]);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    getWeeklyReviewItems(userId).then(r => setItems(r || []));
  }, [userId]);

  // Show if it's Friday OR if the pool is non-empty
  const isFriday = new Date().getDay() === 5;
  if (items.length === 0 && !isFriday) return null;
  if (items.length === 0) return null;

  if (showReview) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: B.navy }}>Weekly Review</span>
          <button onClick={() => setShowReview(false)}
            style={{ padding: "5px 12px", border: `1px solid ${B.bdr}`, borderRadius: 6, background: "#fff", color: B.t3, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            Close
          </button>
        </div>
        <AssessmentModule
          blocks={items}
          sectionId="weekly_review"
          userId={userId}
          onModuleComplete={() => {
            setShowReview(false);
            // Refresh items
            getWeeklyReviewItems(userId).then(r => setItems(r || []));
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ background: B.card, border: `1px solid ${B.purple}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1v6M4 5l4 4 4-4" stroke={B.purple} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: B.purple, textTransform: "uppercase", letterSpacing: .8 }}>
              {isFriday ? "Friday Review" : "Spaced Review"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: B.t2 }}>
            You have {items.length} item{items.length !== 1 ? "s" : ""} from previous sections to review
          </div>
        </div>
        <button onClick={() => setShowReview(true)}
          style={{ padding: "8px 18px", border: "none", borderRadius: 7, background: B.purple, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          Start Review
        </button>
      </div>
    </div>
  );
}
