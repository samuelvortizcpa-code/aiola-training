import { useState, useEffect } from "react";
import { B } from "../../lib/brand.js";
import { getPool } from "../../lib/spacedRepetition.js";
import { getTagById } from "../../data/topicTags.js";

export default function ConfidentMisses({ userId }) {
  const [pool, setPool] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    getPool(userId).then(p => {
      // Filter to confident misses only (confidence >= 4)
      const misses = (p || []).filter(item => (item.confidenceAtMiss || 0) >= 4);
      misses.sort((a, b) => (b.missedAt || "").localeCompare(a.missedAt || ""));
      setPool(misses);
    });
  }, [userId]);

  if (pool.length === 0) {
    return (
      <div style={{ background: B.card, border: `1px solid ${B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" stroke={B.err} strokeWidth="1.3" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>Confident Misses</span>
        </div>
        <div style={{ padding: "16px 18px", textAlign: "center", fontSize: 12, color: B.t3 }}>No confident misses recorded</div>
      </div>
    );
  }

  return (
    <div style={{ background: B.card, border: `1px solid ${B.err}33`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fef2f2" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" stroke={B.err} strokeWidth="1.3" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: B.err, textTransform: "uppercase", letterSpacing: .8 }}>Confident Misses</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: B.err, background: "#fee2e2", padding: "2px 8px", borderRadius: 10 }}>{pool.length} item{pool.length !== 1 ? "s" : ""}</span>
      </div>

      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {pool.map((item, i) => {
          const block = item.blockSnapshot;
          const question = block?.question || block?.title || block?.prompt || "Assessment block";
          const truncated = question.length > 60 ? question.slice(0, 60) + "..." : question;
          const tags = (item.topicTags || []).map(t => getTagById(t)).filter(Boolean);
          const date = item.missedAt ? new Date(item.missedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

          return (
            <div key={item.blockId || i}
              onClick={() => setSelectedItem(selectedItem === i ? null : i)}
              style={{
                padding: "10px 18px", borderBottom: i < pool.length - 1 ? `1px solid ${B.bdr}` : "none",
                cursor: "pointer", transition: "background .15s", background: selectedItem === i ? "#fef2f2" : "transparent",
              }}
              onMouseEnter={e => { if (selectedItem !== i) e.currentTarget.style.background = "#fafbfc"; }}
              onMouseLeave={e => { if (selectedItem !== i) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: B.t1, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{truncated}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: B.t3 }}>{date}</span>
                    {tags.map(t => (
                      <span key={t.id} style={{ fontSize: 9, fontWeight: 600, color: B.blue, background: B.blueL, padding: "1px 6px", borderRadius: 4 }}>{t.label}</span>
                    ))}
                    <span style={{ fontSize: 9, color: B.t3 }}>{item.sectionId}</span>
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: B.err, background: "#fee2e2", padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>
                  Conf: {item.confidenceAtMiss}
                </span>
              </div>

              {/* Expanded detail */}
              {selectedItem === i && block && (
                <div style={{ marginTop: 10, padding: "10px 12px", background: "#fff", border: `1px solid ${B.bdr}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: B.navy, marginBottom: 8, lineHeight: 1.5 }}>{block.question || block.title || block.prompt}</div>
                  {block.options && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {block.options.map((opt, idx) => {
                        const isCorrect = idx === block.correct;
                        return (
                          <div key={idx} style={{
                            padding: "6px 10px", borderRadius: 6, fontSize: 11,
                            border: `1px solid ${isCorrect ? B.ok : B.bdr}`,
                            background: isCorrect ? B.okBg : "#fff",
                            color: isCorrect ? B.ok : B.t2,
                          }}>
                            {isCorrect && <span style={{ fontSize: 9, fontWeight: 700, color: B.ok, marginRight: 4 }}>Correct:</span>}
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {block.explanation && (
                    <div style={{ marginTop: 8, fontSize: 11, color: B.t2, lineHeight: 1.5, padding: "8px 10px", background: B.blueL, borderRadius: 6 }}>
                      {block.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
