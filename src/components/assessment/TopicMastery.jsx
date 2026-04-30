import { useState, useEffect } from "react";
import { B } from "../../lib/brand.js";
import { TOPIC_TAGS, CATEGORIES } from "../../data/topicTags.js";
import { getMasteryMap } from "../../lib/spacedRepetition.js";

const STATE_COLORS = {
  mastered: B.ok,
  in_progress: B.blue,
  weak: B.warn,
  never_seen: "#94a3b8",
};

const STATE_BG = {
  mastered: B.okL,
  in_progress: B.blueL,
  weak: B.warnL,
  never_seen: "#f1f5f9",
};

export default function TopicMastery({ userId }) {
  const [mastery, setMastery] = useState({});
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    getMasteryMap(userId).then(m => setMastery(m || {}));
  }, [userId]);

  const getState = (tagId) => mastery[tagId] || "never_seen";

  const counts = { mastered: 0, in_progress: 0, weak: 0, never_seen: 0 };
  for (const tag of TOPIC_TAGS) {
    counts[getState(tag.id)]++;
  }

  return (
    <div style={{ background: B.card, border: `1px solid ${B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke={B.blue} strokeWidth="1.3" /><path d="M5 8l2 2 4-4" stroke={B.blue} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>Topic Mastery</span>
      </div>

      {/* Counts summary */}
      <div style={{ padding: "12px 18px", display: "flex", gap: 16, flexWrap: "wrap", borderBottom: `1px solid ${B.bdr}` }}>
        {[
          { key: "mastered", label: "Mastered", color: B.ok },
          { key: "in_progress", label: "In Progress", color: B.blue },
          { key: "weak", label: "Weak", color: B.warn },
          { key: "never_seen", label: "Not Covered", color: "#94a3b8" },
        ].map(s => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: s.color }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{counts[s.key]}</span>
            <span style={{ fontSize: 11, color: B.t3 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div style={{ padding: "8px 0" }}>
        {CATEGORIES.map(cat => {
          const catTags = TOPIC_TAGS.filter(t => t.category === cat);
          const isOpen = !!expanded[cat];
          const catMastered = catTags.filter(t => getState(t.id) === "mastered").length;

          return (
            <div key={cat}>
              <button
                onClick={() => setExpanded(p => ({ ...p, [cat]: !p[cat] }))}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 18px", border: "none", background: isOpen ? "#fafbfc" : "transparent",
                  cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600,
                  color: B.t1, transition: "background .15s",
                }}
              >
                <span>{cat}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: B.t3 }}>{catMastered}/{catTags.length}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transition: "transform .15s", transform: isOpen ? "rotate(180deg)" : "none" }}>
                    <path d="M2 3.5l3 3 3-3" stroke={B.t3} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </button>
              {isOpen && (
                <div style={{ padding: "6px 18px 12px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {catTags.map(tag => {
                    const state = getState(tag.id);
                    return (
                      <div
                        key={tag.id}
                        title={tag.description}
                        style={{
                          padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                          color: STATE_COLORS[state], background: STATE_BG[state],
                          border: `1px solid ${STATE_COLORS[state]}33`,
                          cursor: "default",
                        }}
                      >
                        {tag.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
