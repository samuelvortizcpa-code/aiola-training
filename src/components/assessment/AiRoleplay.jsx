import { B } from "../../lib/brand.js";

export default function AiRoleplay({ block, onComplete }) {
  // For Prompt 1, all roleplay blocks default to placeholder: true
  // When placeholder is false, a real chat UI would be rendered here
  return (
    <div style={{ background: B.card, border: `1px solid ${B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" stroke={B.purple} strokeWidth="1.3" /><path d="M5 6.5C5.5 5 6.5 4.5 8 4.5s2.5.5 3 2M6 10h4" stroke={B.purple} strokeWidth="1.2" strokeLinecap="round" /></svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>AI Roleplay</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: B.t3 }}>{block.title}</span>
      </div>

      {block.placeholder ? (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: B.purpleL, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke={B.purple} strokeWidth="2" /></svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: B.navy, marginBottom: 6 }}>AI Roleplay — Coming Soon</div>
          <div style={{ fontSize: 12, color: B.t2, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 20px" }}>
            Speak with Nick to schedule a live mock for now.
          </div>
          <div style={{ fontSize: 11, color: B.t3, padding: "8px 14px", background: B.purpleL, borderRadius: 8, display: "inline-block" }}>
            Persona: {block.personaName} · {block.maxTurns} turns · {block.rubric?.length || 0} rubric criteria
          </div>
          <div style={{ marginTop: 20 }}>
            <button onClick={() => onComplete(1, { skipped: true, reason: "placeholder" }, { type: "AI_ROLEPLAY", id: block.id })}
              style={{ padding: "8px 20px", border: `1px solid ${B.bdr}`, borderRadius: 7, background: "#fff", color: B.t2, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
              Continue →
            </button>
          </div>
        </div>
      ) : (
        // Non-placeholder: future implementation
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: B.t3 }}>Chat interface will be available in a future update.</div>
          <button onClick={() => onComplete(1, { skipped: true, reason: "not_implemented" }, { type: "AI_ROLEPLAY", id: block.id })}
            style={{ marginTop: 16, padding: "8px 20px", border: `1px solid ${B.bdr}`, borderRadius: 7, background: "#fff", color: B.t2, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}
