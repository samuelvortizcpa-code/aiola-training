import { useState, useRef } from "react";
import { B } from "../../lib/brand.js";

export default function DocumentMarkup({ block, onComplete }) {
  const [flags, setFlags] = useState([]); // [{regionId, comment, x, y}]
  const [commentDraft, setCommentDraft] = useState("");
  const [pendingClick, setPendingClick] = useState(null); // {x, y, regionId}
  const [submitted, setSubmitted] = useState(false);
  const imgRef = useRef(null);

  const handleImageClick = (e) => {
    if (submitted) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if click is within any defined region
    const matchedRegion = block.regions.find(r => {
      const c = r.coords;
      return x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;
    });

    setPendingClick({ x, y, regionId: matchedRegion?.id || null });
    setCommentDraft("");
  };

  const confirmFlag = () => {
    if (!pendingClick) return;
    setFlags(prev => [...prev, { ...pendingClick, comment: commentDraft }]);
    setPendingClick(null);
    setCommentDraft("");
  };

  const removeFlag = (idx) => {
    if (submitted) return;
    setFlags(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    setSubmitted(true);

    // Score: per spec §3.2
    // +1 for each critical region flagged, +0.5 for important, +0.25 for nice
    // -0.25 for false positive flags (clicks not in any region)
    const flaggedRegionIds = new Set(flags.filter(f => f.regionId).map(f => f.regionId));
    const falsePositives = flags.filter(f => !f.regionId).length;

    let earned = 0;
    let maxPossible = 0;
    for (const region of block.regions) {
      if (region.category === "false_positive") continue;
      const weight = region.severity === "critical" ? 1 : region.severity === "important" ? 0.5 : 0.25;
      maxPossible += weight;
      if (flaggedRegionIds.has(region.id)) earned += weight;
    }
    const penalty = falsePositives * 0.25;
    const score = maxPossible > 0 ? Math.max(0, Math.min(1, (earned - penalty) / maxPossible)) : 1;

    onComplete(score, { flags, flaggedRegionIds: [...flaggedRegionIds] }, { type: "DOCUMENT_MARKUP", id: block.id });
  };

  // Categorize regions for results display
  const flaggedRegionIds = new Set(flags.filter(f => f.regionId).map(f => f.regionId));

  return (
    <div style={{ background: B.card, border: `1px solid ${B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke={B.blue} strokeWidth="1.3" /><path d="M5 6h6M5 8h4M5 10h5" stroke={B.blue} strokeWidth="1" strokeLinecap="round" /></svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>Document Review</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: B.t3 }}>{block.title}</span>
      </div>

      <div style={{ padding: 18 }}>
        {/* Context */}
        <div style={{ fontSize: 12, color: B.t2, lineHeight: 1.6, marginBottom: 12 }}>{block.context}</div>

        {/* Document image */}
        <div style={{ position: "relative", marginBottom: 12, border: `1px solid ${B.bdr}`, borderRadius: 8, overflow: "hidden", cursor: submitted ? "default" : "crosshair" }}>
          <img
            ref={imgRef}
            src={block.documentUrl}
            alt="Document to review"
            style={{ width: "100%", display: "block" }}
            onClick={handleImageClick}
          />
          {/* Show placed flags */}
          {flags.map((f, i) => (
            <div key={i} onClick={(e) => { e.stopPropagation(); if (!submitted) removeFlag(i); }}
              style={{
                position: "absolute", left: `${f.x}%`, top: `${f.y}%`, transform: "translate(-50%,-50%)",
                width: 20, height: 20, borderRadius: 10,
                background: submitted ? (f.regionId ? B.ok : B.err) : B.blue,
                border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, color: "#fff", fontWeight: 700, cursor: submitted ? "default" : "pointer",
              }}
            >
              {i + 1}
            </div>
          ))}
          {/* Show region overlays on submit */}
          {submitted && block.regions.filter(r => r.category !== "false_positive").map(r => {
            const isFlagged = flaggedRegionIds.has(r.id);
            const color = isFlagged ? B.ok : r.severity === "critical" ? B.err : B.warn;
            return (
              <div key={r.id} style={{
                position: "absolute",
                left: `${r.coords.x}%`, top: `${r.coords.y}%`,
                width: `${r.coords.w}%`, height: `${r.coords.h}%`,
                border: `2px solid ${color}`, borderRadius: 4,
                background: `${color}22`,
              }} />
            );
          })}
        </div>

        {/* Pending click comment box */}
        {pendingClick && !submitted && (
          <div style={{ padding: "12px 14px", background: B.blueL, border: `1px solid ${B.blueM}`, borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: B.blue, marginBottom: 6 }}>Why are you flagging this area?</div>
            <textarea value={commentDraft} onChange={e => setCommentDraft(e.target.value)} placeholder="Describe the issue..."
              rows={2} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${B.bdr}`, borderRadius: 6, fontSize: 12, fontFamily: "'DM Sans',sans-serif", resize: "vertical", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={confirmFlag} style={{ padding: "6px 14px", border: "none", borderRadius: 6, background: B.blue, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Add Flag</button>
              <button onClick={() => setPendingClick(null)} style={{ padding: "6px 14px", border: `1px solid ${B.bdr}`, borderRadius: 6, background: "#fff", color: B.t3, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Flag list */}
        {flags.length > 0 && !submitted && (
          <div style={{ marginBottom: 12, fontSize: 11, color: B.t2 }}>
            {flags.length} area{flags.length !== 1 ? "s" : ""} flagged. Click a flag marker to remove it.
          </div>
        )}

        {/* Submit button */}
        {!submitted && (
          <button onClick={handleSubmit} disabled={flags.length === 0}
            style={{ padding: "8px 20px", border: "none", borderRadius: 7, background: flags.length > 0 ? B.blue : B.bdr, color: "#fff", fontSize: 12, fontWeight: 600, cursor: flags.length > 0 ? "pointer" : "default", fontFamily: "inherit" }}>
            Submit Review ({flags.length} flag{flags.length !== 1 ? "s" : ""})
          </button>
        )}

        {/* Results */}
        {submitted && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: B.t3, marginBottom: 8 }}>Answer Key</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {block.regions.filter(r => r.category !== "false_positive").map(r => {
                const isFlagged = flaggedRegionIds.has(r.id);
                const color = isFlagged ? B.ok : r.severity === "critical" ? B.err : B.warn;
                const label = isFlagged ? "Correctly Flagged" : r.severity === "critical" ? "Missed (Critical)" : "Missed";
                return (
                  <div key={r.id} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${color}`, background: isFlagged ? B.okBg : r.severity === "critical" ? "#fef2f2" : B.warnL }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color, padding: "1px 6px", borderRadius: 4, background: `${color}22` }}>{label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: B.t1 }}>{r.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: B.t2, lineHeight: 1.5 }}>{r.explanation}</div>
                  </div>
                );
              })}
            </div>
            {block.answerKeyExplanation && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: B.blueL, border: `1px solid ${B.blueM}`, fontSize: 12, color: B.t1, lineHeight: 1.6 }}>
                {block.answerKeyExplanation}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
