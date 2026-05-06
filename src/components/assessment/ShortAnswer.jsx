import { useState } from "react";
import { B } from "../../lib/brand.js";

export default function ShortAnswer({ block, onComplete }) {
  const [response, setResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [selfCheck, setSelfCheck] = useState(null); // "got_it" | "needs_work"

  const canSubmit = response.trim().length > 0;

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleSelfCheck = (verdict) => {
    setSelfCheck(verdict);
    const score = verdict === "got_it" ? 1 : 0.25;
    onComplete(score, {
      response,
      selfCheck: verdict,
      topicTags: block.topicTags || [],
      difficulty: block.difficulty || 1,
    }, { type: "SHORT_ANSWER", id: block.id });
  };

  return (
    <div style={{ background: B.card, border: `1px solid ${B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke={B.blue} strokeWidth="1.3" fill="none" /><path d="M5 7h6M5 9.5h4" stroke={B.blue} strokeWidth="1.2" strokeLinecap="round" /></svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>Short Answer</span>
      </div>

      <div style={{ padding: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: B.navy, lineHeight: 1.5, marginTop: 0, marginBottom: 14 }}>{block.question}</p>

        {/* Textarea */}
        <textarea
          value={response}
          onChange={(e) => { if (!submitted) setResponse(e.target.value); }}
          readOnly={submitted}
          rows={7}
          placeholder="Type your answer here..."
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 14px",
            border: `2px solid ${submitted ? B.ok : B.bdr}`, borderRadius: 7,
            fontSize: 12, fontFamily: "inherit", lineHeight: 1.6, color: B.t1,
            background: submitted ? "#f8fafb" : "#fff", resize: "vertical",
            outline: "none", transition: "border-color .2s",
          }}
        />

        {/* Submit */}
        {!submitted && (
          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{
              marginTop: 10, padding: "8px 20px", border: "none", borderRadius: 7,
              background: canSubmit ? B.blue : B.bdr, color: "#fff",
              fontSize: 12, fontWeight: 600, cursor: canSubmit ? "pointer" : "default", fontFamily: "inherit",
            }}>
            Submit
          </button>
        )}

        {/* Model Answer reveal + self-check */}
        {submitted && (
          <>
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: B.blueL, border: `1px solid ${B.blueM}`, fontSize: 12, color: B.t1, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 11, color: B.blue }}>Model Answer</div>
              {block.model_answer}
            </div>

            {!selfCheck && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: B.t2, marginBottom: 8 }}>How did you do?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleSelfCheck("got_it")}
                    style={{
                      padding: "8px 18px", border: `2px solid ${B.ok}`, borderRadius: 7,
                      background: "#fff", color: B.ok, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit", transition: "all .2s",
                    }}>
                    Got it
                  </button>
                  <button onClick={() => handleSelfCheck("needs_work")}
                    style={{
                      padding: "8px 18px", border: `2px solid ${B.warn}`, borderRadius: 7,
                      background: "#fff", color: B.warn, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit", transition: "all .2s",
                    }}>
                    Needs work
                  </button>
                </div>
              </div>
            )}

            {selfCheck && (
              <div style={{
                marginTop: 12, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: selfCheck === "got_it" ? B.okBg : "#fffbeb",
                color: selfCheck === "got_it" ? B.ok : B.warn,
                border: `1px solid ${selfCheck === "got_it" ? B.ok : B.warn}`,
              }}>
                {selfCheck === "got_it" ? "Marked as understood" : "Marked for review"}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
