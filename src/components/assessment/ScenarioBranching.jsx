import { useState } from "react";
import { B } from "../../lib/brand.js";

export default function ScenarioBranching({ block, onComplete }) {
  const [currentDecisionId, setCurrentDecisionId] = useState(block.decisions[0]?.id || null);
  const [path, setPath] = useState([]); // [{decisionId, optionIdx, option}]
  const [terminalId, setTerminalId] = useState(null);

  const currentDecision = block.decisions.find(d => d.id === currentDecisionId);
  const terminal = terminalId ? block.terminals.find(t => t.id === terminalId) : null;

  const handleChoice = (option, optIdx) => {
    const newPath = [...path, { decisionId: currentDecisionId, optionIdx: optIdx, option }];
    setPath(newPath);

    if (option.terminalId) {
      setTerminalId(option.terminalId);
      setCurrentDecisionId(null);
      // Compute score
      const maxWeightPath = computeMaxWeight(block.decisions, block.decisions[0]?.id);
      const earnedWeight = newPath
        .filter(p => p.option.correctness === "great" || p.option.correctness === "acceptable")
        .reduce((sum, p) => sum + p.option.weight, 0);
      const score = maxWeightPath > 0 ? Math.min(1, earnedWeight / maxWeightPath) : 1;
      onComplete(score, { path: newPath, terminalId: option.terminalId }, { type: "SCENARIO_BRANCHING", id: block.id });
    } else if (option.nextId) {
      setCurrentDecisionId(option.nextId);
    }
  };

  // Compute optimal path
  const optimalPath = buildOptimalPath(block.decisions, block.decisions[0]?.id);

  return (
    <div style={{ background: B.card, border: `1px solid ${B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1v6M8 7l-4 4M8 7l4 4" stroke={B.blue} strokeWidth="1.5" strokeLinecap="round" /></svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>Scenario</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: B.t3 }}>{block.title}</span>
      </div>

      <div style={{ padding: 18 }}>
        {/* Context */}
        <div style={{ fontSize: 12, color: B.t2, lineHeight: 1.6, marginBottom: 16, padding: "12px 14px", background: B.blueL, borderRadius: 8, border: `1px solid ${B.blueM}` }}>
          {block.context}
        </div>

        {/* Active decision */}
        {currentDecision && !terminal && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: B.navy, lineHeight: 1.5, marginBottom: 14 }}>{currentDecision.prompt}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {currentDecision.options.map((opt, idx) => (
                <button key={idx} onClick={() => handleChoice(opt, idx)}
                  style={{ padding: "12px 16px", border: `2px solid ${B.bdr}`, borderRadius: 8, background: "#fff", cursor: "pointer", textAlign: "left", fontSize: 12, color: B.t1, fontFamily: "'DM Sans',sans-serif", transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = B.blue; e.currentTarget.style.background = B.blueL; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = B.bdr; e.currentTarget.style.background = "#fff"; }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Terminal — show results */}
        {terminal && (
          <div>
            <div style={{ padding: "14px 16px", borderRadius: 8, marginBottom: 16, background: outcomeColor(terminal.outcome).bg, border: `1px solid ${outcomeColor(terminal.outcome).border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: outcomeColor(terminal.outcome).text, marginBottom: 4 }}>
                Outcome: {terminal.label}
              </div>
              <div style={{ fontSize: 12, color: B.t1, lineHeight: 1.6 }}>{terminal.coachingNote}</div>
            </div>

            {/* Path comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: B.t3, marginBottom: 8 }}>Your Path</div>
                {path.map((p, i) => {
                  const c = outcomeColor(p.option.correctness);
                  return (
                    <div key={i} style={{ padding: "8px 10px", marginBottom: 4, borderRadius: 6, background: c.bg, border: `1px solid ${c.border}`, fontSize: 11, color: B.t1 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: c.text }}>{i + 1}.</span> {p.option.text}
                    </div>
                  );
                })}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: B.t3, marginBottom: 8 }}>Optimal Path</div>
                {optimalPath.map((opt, i) => (
                  <div key={i} style={{ padding: "8px 10px", marginBottom: 4, borderRadius: 6, background: B.okBg, border: `1px solid ${B.ok}`, fontSize: 11, color: B.t1 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: B.ok }}>{i + 1}.</span> {opt.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function outcomeColor(outcome) {
  switch (outcome) {
    case "great": return { bg: "#f0fdf4", border: "#22c55e", text: "#22c55e" };
    case "acceptable": return { bg: "#EBF4FB", border: "#3B8DD0", text: "#3B8DD0" };
    case "risky": return { bg: "#fef3c7", border: "#f59e0b", text: "#f59e0b" };
    case "harmful": return { bg: "#fef2f2", border: "#ef4444", text: "#ef4444" };
    default: return { bg: "#f1f5f9", border: "#e2e8f0", text: "#5a6577" };
  }
}

function computeMaxWeight(decisions, startId) {
  let maxWeight = 0;
  function dfs(decId, weight) {
    const dec = decisions.find(d => d.id === decId);
    if (!dec) { maxWeight = Math.max(maxWeight, weight); return; }
    for (const opt of dec.options) {
      const newWeight = weight + ((opt.correctness === "great" || opt.correctness === "acceptable") ? opt.weight : 0);
      if (opt.terminalId) { maxWeight = Math.max(maxWeight, newWeight); }
      else if (opt.nextId) { dfs(opt.nextId, newWeight); }
    }
  }
  dfs(startId, 0);
  return maxWeight;
}

function buildOptimalPath(decisions, startId) {
  let bestPath = [];
  let bestWeight = -1;
  function dfs(decId, currentPath, weight) {
    const dec = decisions.find(d => d.id === decId);
    if (!dec) { if (weight > bestWeight) { bestWeight = weight; bestPath = [...currentPath]; } return; }
    for (const opt of dec.options) {
      const w = (opt.correctness === "great") ? opt.weight : 0;
      const newPath = [...currentPath, opt];
      if (opt.terminalId) { if (weight + w > bestWeight) { bestWeight = weight + w; bestPath = newPath; } }
      else if (opt.nextId) { dfs(opt.nextId, newPath, weight + w); }
    }
  }
  dfs(startId, [], 0);
  return bestPath;
}
