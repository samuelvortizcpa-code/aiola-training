import { useState } from "react";
import { B } from "../../lib/brand.js";

export default function ConfidenceMcq({ block, onComplete }) {
  const [selected, setSelected] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected === block.correct;

  const handleSubmit = () => {
    setSubmitted(true);
    const score = isCorrect ? 1 : 0;
    onComplete(score, {
      answer: selected,
      correct: isCorrect,
      confidence,
      topicTags: block.topicTags || [],
      difficulty: block.difficulty || 1,
    }, { type: "CONFIDENCE_MCQ", id: block.id });
  };

  const canSubmit = selected !== null && confidence !== null;

  return (
    <div style={{ background: B.card, border: `1px solid ${B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke={B.blue} strokeWidth="1.3" /><text x="8" y="11" textAnchor="middle" fontSize="9" fontWeight="700" fill={B.blue}>?</text></svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>Knowledge Check</span>
      </div>

      <div style={{ padding: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: B.navy, lineHeight: 1.5, marginTop: 0, marginBottom: 14 }}>{block.question}</p>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {block.options.map((opt, idx) => {
            const isSel = selected === idx;
            const isCor = idx === block.correct;
            let bg = "#fff", bd = B.bdr, cl = B.t1;
            if (submitted) {
              if (isCor) { bg = B.okBg; bd = B.ok; cl = B.ok; }
              else if (isSel && !isCor) { bg = "#fef2f2"; bd = B.err; cl = B.err; }
            } else if (isSel) { bg = B.blueL; bd = B.blue; cl = B.blue; }

            return (
              <div key={idx} onClick={() => { if (!submitted) setSelected(idx); }}
                style={{
                  padding: "10px 14px", border: `2px solid ${bd}`, borderRadius: 7,
                  cursor: submitted ? "default" : "pointer", background: bg, color: cl,
                  fontSize: 12, fontWeight: isSel ? 600 : 400, transition: "all .2s",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 10, flexShrink: 0,
                  border: `2px solid ${isSel ? bd : B.bdr}`,
                  background: isSel ? (submitted ? (isCor ? B.ok : B.err) : B.blue) : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s",
                }}>
                  {isSel && <div style={{ width: 6, height: 6, borderRadius: 3, background: "#fff" }} />}
                </span>
                {opt}
                {submitted && isSel && isCor && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: B.ok }}>Correct</span>}
                {submitted && isSel && !isCor && <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 600, color: B.err }}>Incorrect</span>}
              </div>
            );
          })}
        </div>

        {/* Confidence rating */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: B.t2, marginBottom: 8 }}>How confident are you? (1 = guessing, 5 = certain)</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => { if (!submitted) setConfidence(n); }}
                style={{
                  width: 40, height: 36, border: `2px solid ${confidence === n ? B.blue : B.bdr}`,
                  borderRadius: 8, background: confidence === n ? B.blueL : "#fff",
                  color: confidence === n ? B.blue : B.t2, fontSize: 14, fontWeight: 700,
                  cursor: submitted ? "default" : "pointer", fontFamily: "inherit", transition: "all .2s",
                }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        {!submitted && (
          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ padding: "8px 20px", border: "none", borderRadius: 7, background: canSubmit ? B.blue : B.bdr, color: "#fff", fontSize: 12, fontWeight: 600, cursor: canSubmit ? "pointer" : "default", fontFamily: "inherit" }}>
            Submit
          </button>
        )}

        {/* Explanation */}
        {submitted && block.explanation && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: B.blueL, border: `1px solid ${B.blueM}`, fontSize: 12, color: B.t1, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 11, color: B.blue }}>Explanation</div>
            {block.explanation}
          </div>
        )}
      </div>
    </div>
  );
}
