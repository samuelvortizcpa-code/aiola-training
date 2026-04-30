import { useState } from "react";
import { B } from "../../lib/brand.js";

export default function Computation({ block, onComplete }) {
  const [answer, setAnswer] = useState("");
  const [attempt, setAttempt] = useState(0); // 0=not started, 1=first attempt, 2=second attempt
  const [result, setResult] = useState(null); // "correct" | "wrong" | "locked"
  const [showWorked, setShowWorked] = useState(false);

  const unitLabel = block.unit === "dollars" ? "$" : block.unit === "percent" ? "%" : "";
  const unitPrefix = block.unit === "dollars";

  const checkAnswer = () => {
    const num = parseFloat(answer);
    if (isNaN(num)) return;

    const isCorrect = Math.abs(num - block.expectedAnswer) <= (block.tolerance || 0);

    if (isCorrect) {
      const score = attempt === 0 ? 1 : 0.6; // 60% credit on second attempt
      setResult("correct");
      setAttempt(prev => prev + 1);
      onComplete(score, { answer: num, attempts: attempt + 1 }, { type: "COMPUTATION", id: block.id });
    } else {
      const newAttempt = attempt + 1;
      setAttempt(newAttempt);
      if (newAttempt >= 2) {
        setResult("locked");
        onComplete(0, { answer: num, attempts: 2, locked: true }, { type: "COMPUTATION", id: block.id });
      } else {
        setResult("wrong");
        setShowWorked(true);
        setAnswer("");
      }
    }
  };

  // Check for common wrong answer feedback
  const commonWrong = result === "wrong" || result === "locked"
    ? block.commonWrongAnswers?.find(cw => Math.abs(parseFloat(answer || 0) - cw.value) <= (block.tolerance || 0))
    : null;

  return (
    <div style={{ background: B.card, border: `1px solid ${B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke={B.blue} strokeWidth="1.3" /><path d="M5 5h6M5 8h4M5 11h5" stroke={B.blue} strokeWidth="1" strokeLinecap="round" /></svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>Computation</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: B.t3 }}>{block.title}</span>
      </div>

      <div style={{ padding: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: B.navy, lineHeight: 1.6, marginTop: 0, marginBottom: 14 }}>{block.prompt}</p>

        {block.formLine && (
          <div style={{ fontSize: 11, color: B.blue, background: B.blueL, padding: "6px 12px", borderRadius: 6, marginBottom: 12, display: "inline-block" }}>
            Reference: {block.formLine}
          </div>
        )}

        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          {unitPrefix && <span style={{ fontSize: 16, fontWeight: 600, color: B.t2 }}>{unitLabel}</span>}
          <input
            type="number"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            disabled={result === "correct" || result === "locked"}
            placeholder="Enter your answer"
            style={{
              padding: "10px 14px", border: `2px solid ${result === "correct" ? B.ok : result === "locked" ? B.err : B.bdr}`,
              borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans',sans-serif", width: 200,
              background: result === "correct" ? B.okBg : result === "locked" ? "#fef2f2" : "#fff",
              color: B.t1, outline: "none",
            }}
            onKeyDown={e => { if (e.key === "Enter" && !result) checkAnswer(); }}
          />
          {!unitPrefix && <span style={{ fontSize: 14, fontWeight: 600, color: B.t2 }}>{unitLabel}</span>}
        </div>

        {/* Attempt info */}
        {result === "wrong" && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: `1px solid ${B.err}`, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: B.err, marginBottom: 4 }}>Incorrect — try once more (60% credit)</div>
            {commonWrong && <div style={{ fontSize: 11, color: B.t2 }}>Common mistake: {commonWrong.indicates}</div>}
          </div>
        )}

        {result === "correct" && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: B.okBg, border: `1px solid ${B.ok}`, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: B.ok }}>
              Correct! {attempt > 1 ? "(60% credit — second attempt)" : ""}
            </div>
            <div style={{ fontSize: 11, color: B.t2, marginTop: 4 }}>Answer: {block.unit === "dollars" ? "$" : ""}{block.expectedAnswer}{block.unit === "percent" ? "%" : ""}</div>
          </div>
        )}

        {result === "locked" && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: `1px solid ${B.err}`, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: B.err }}>Locked — Awaiting admin review</div>
            <div style={{ fontSize: 11, color: B.t2, marginTop: 4 }}>
              Correct answer: {block.unit === "dollars" ? "$" : ""}{block.expectedAnswer}{block.unit === "percent" ? "%" : ""}
              {block.tolerance > 0 && ` (±${block.unit === "dollars" ? "$" : ""}${block.tolerance}${block.unit === "percent" ? "%" : ""})`}
            </div>
          </div>
        )}

        {/* Submit button */}
        {!result && (
          <button onClick={checkAnswer} disabled={!answer.trim()}
            style={{ padding: "8px 20px", border: "none", borderRadius: 7, background: answer.trim() ? B.blue : B.bdr, color: "#fff", fontSize: 12, fontWeight: 600, cursor: answer.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
            {attempt > 0 ? "Try Again" : "Submit"}
          </button>
        )}
        {result === "wrong" && (
          <button onClick={checkAnswer} disabled={!answer.trim()}
            style={{ padding: "8px 20px", border: "none", borderRadius: 7, background: answer.trim() ? B.blue : B.bdr, color: "#fff", fontSize: 12, fontWeight: 600, cursor: answer.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
            Submit (2nd Attempt)
          </button>
        )}

        {/* Worked solution */}
        {showWorked && block.workedSolution?.length > 0 && (
          <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 8, background: B.blueL, border: `1px solid ${B.blueM}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: B.blue, marginBottom: 8 }}>Worked Solution</div>
            {block.workedSolution.map((step, i) => (
              <div key={i} style={{ fontSize: 12, color: B.t1, lineHeight: 1.6, marginBottom: 4, paddingLeft: 12, borderLeft: `2px solid ${B.blueM}` }}>
                <span style={{ fontWeight: 600, color: B.blue }}>{i + 1}.</span> {step}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
