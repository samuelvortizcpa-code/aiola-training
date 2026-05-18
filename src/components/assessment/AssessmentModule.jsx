import { useState, useEffect } from "react";
import { B } from "../../lib/brand.js";
import ScenarioBranching from "./ScenarioBranching.jsx";
import DocumentMarkup from "./DocumentMarkup.jsx";
import AiRoleplay from "./AiRoleplay.jsx";
import DragExercise from "./DragExercise.jsx";
import Computation from "./Computation.jsx";
import ConfidenceMcq from "./ConfidenceMcq.jsx";
import ShortAnswer from "./ShortAnswer.jsx";
import CaseLawResearch from "./CaseLawResearch.jsx";
import { storage } from "../../lib/storage.js";
import {
  addToPool, markMastered, recordTopicHit,
} from "../../lib/spacedRepetition.js";

const PASS_THRESHOLD = 0.75;

const COMPONENT_MAP = {
  SCENARIO_BRANCHING: ScenarioBranching,
  DOCUMENT_MARKUP: DocumentMarkup,
  AI_ROLEPLAY: AiRoleplay,
  DRAG_EXERCISE: DragExercise,
  COMPUTATION: Computation,
  CONFIDENCE_MCQ: ConfidenceMcq,
  SHORT_ANSWER: ShortAnswer,
  CASE_LAW: CaseLawResearch,
};

export default function AssessmentModule({ blocks, sectionId, userId, onModuleComplete, isAdminView, sectionTopicTags, onToggleLock }) {
  const [blockResults, setBlockResults] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [allBlocks, setAllBlocks] = useState(blocks);
  const [lockLoading, setLockLoading] = useState(sectionId !== "weekly_review" && !isAdminView);
  const [lockedRecord, setLockedRecord] = useState(null);

  useEffect(() => {
    setAllBlocks(blocks);
  }, [blocks]);

  // Mount-time lock check — skip for weekly_review and admin view
  useEffect(() => {
    if (sectionId === "weekly_review" || isAdminView) return;
    (async () => {
      try {
        const key = `assessment:${userId}:${sectionId}`;
        const d = await storage.get(key);
        if (d) {
          const record = JSON.parse(d.value || d);
          if (record.locked !== false) {
            setLockedRecord(record);
          }
        }
      } catch {}
      setLockLoading(false);
    })();
  }, [userId, sectionId, isAdminView]);

  const completedCount = Object.keys(blockResults).length;
  const allDone = allBlocks.length > 0 && completedCount === allBlocks.length;

  // Compute module score when all blocks done
  useEffect(() => {
    if (!allDone) return;

    const scores = allBlocks.map(b => blockResults[b.id]?.score ?? 0);
    const moduleScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const passed = moduleScore >= PASS_THRESHOLD;

    let needsAdminReview = false;
    for (const b of allBlocks) {
      if (b.type !== "CONFIDENCE_MCQ") continue;
      const r = blockResults[b.id];
      if (!r) continue;
      const { payload } = r;
      if (!payload.correct && (payload.confidence || 0) >= 4 && (b.difficulty || 1) >= 3) {
        needsAdminReview = true;
      }
    }

    const storageKey = `assessment:${userId}:${sectionId}`;
    const thisAttempt = {
      moduleScore,
      passed,
      needsAdminReview,
      completedAt: new Date().toISOString(),
      blocks: allBlocks.map(b => ({
        blockId: b.id,
        score: blockResults[b.id]?.score ?? 0,
        attempts: blockResults[b.id]?.payload?.attempts || 1,
        payload: blockResults[b.id]?.payload,
        completedAt: blockResults[b.id]?.completedAt,
      })),
    };

    (async () => {
      let existingRecord = null;
      try {
        const d = await storage.get(storageKey);
        if (d) existingRecord = JSON.parse(d.value || d);
      } catch {}

      let prevHistory = existingRecord?.attemptHistory || [];
      if (existingRecord && prevHistory.length === 0) {
        prevHistory = [{
          moduleScore: existingRecord.moduleScore,
          passed: existingRecord.passed,
          needsAdminReview: existingRecord.needsAdminReview,
          completedAt: existingRecord.completedAt,
          blocks: existingRecord.blocks,
        }];
      }
      const result = {
        ...thisAttempt,
        locked: true,
        attemptHistory: [...prevHistory, thisAttempt],
      };

      try { await storage.set(storageKey, JSON.stringify(result)); } catch {}
      if (onModuleComplete) onModuleComplete(result);
    })();
  }, [allDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBlockComplete = (block) => (score, payload, meta) => {
    setBlockResults(prev => ({
      ...prev,
      [block.id]: { score, payload, meta, completedAt: new Date().toISOString() },
    }));

    // ── Spaced repetition logic ──
    if (userId && block.type === "CONFIDENCE_MCQ") {
      const confidence = payload.confidence || 3;
      const isCorrect = payload.correct;
      const isConfident = confidence >= 4;
      const tags = block.topicTags || [];

      if (isCorrect && isConfident) {
        markMastered(userId, block.id, tags);
        recordTopicHit(userId, tags, "correct_confident");
      } else if (isCorrect && !isConfident) {
        recordTopicHit(userId, tags, "correct_uncertain");
      } else if (!isCorrect && isConfident) {
        addToPool(userId, {
          blockId: block.id, sectionId, topicTags: tags,
          confidenceAtMiss: confidence, difficulty: block.difficulty || 1,
          blockSnapshot: block,
        });
        recordTopicHit(userId, tags, "wrong_confident");
      } else {
        addToPool(userId, {
          blockId: block.id, sectionId, topicTags: tags,
          confidenceAtMiss: confidence, difficulty: block.difficulty || 1,
          blockSnapshot: block,
        });
        recordTopicHit(userId, tags, "wrong_uncertain");
      }
    } else if (userId && block.type !== "AI_ROLEPLAY") {
      // Non-MCQ block types
      const tags = block.topicTags || [];
      if (tags.length > 0) {
        if (score < 0.5) {
          addToPool(userId, {
            blockId: block.id, sectionId, topicTags: tags,
            confidenceAtMiss: null, difficulty: block.difficulty || 1,
            blockSnapshot: block,
          });
          recordTopicHit(userId, tags, "wrong_uncertain");
        } else {
          recordTopicHit(userId, tags, "correct_uncertain");
        }
      }
    }

    // Auto-advance
    setTimeout(() => {
      setCurrentIdx(prev => Math.min(prev + 1, allBlocks.length - 1));
    }, 800);
  };

  if (isAdminView) {
    return <AssessmentAdminView blocks={blocks} sectionId={sectionId} userId={userId} onToggleLock={onToggleLock} />;
  }

  // Loading lock state
  if (lockLoading) {
    return (
      <div style={{ background: B.card, border: `1px solid ${B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden", marginBottom: 20, padding: "24px 18px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: B.t3 }}>Loading assessment...</div>
      </div>
    );
  }

  // Locked state — trainee has already completed this assessment
  if (lockedRecord) {
    const passed = lockedRecord.passed;
    return (
      <div style={{ background: B.card, border: `1px solid ${passed ? B.ok : B.err}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: passed ? B.okBg : "#fef2f2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke={passed ? B.ok : B.err} strokeWidth="1.3" /><path d="M5 7l2 2 4-4" stroke={passed ? B.ok : B.err} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: passed ? B.ok : B.err, textTransform: "uppercase", letterSpacing: .8 }}>Assessment Submitted</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="4" y="7" width="8" height="7" rx="1.5" stroke={B.t3} strokeWidth="1.3" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke={B.t3} strokeWidth="1.3" strokeLinecap="round" /></svg>
        </div>
        <div style={{ padding: "20px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: passed ? B.ok : B.err, marginBottom: 4 }}>
            {Math.round((lockedRecord.moduleScore || 0) * 100)}%
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: passed ? B.ok : B.err, marginBottom: 4 }}>
            {passed ? "Passed" : "Not Passed"} (75% required)
          </div>
          {lockedRecord.completedAt && (
            <div style={{ fontSize: 11, color: B.t3, marginBottom: 12 }}>
              Completed {new Date(lockedRecord.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}
          <div style={{ fontSize: 12, color: B.t2, lineHeight: 1.5, padding: "10px 14px", background: "#f8fafc", borderRadius: 8 }}>
            This assessment has been submitted. Contact your manager to request a retake.
          </div>
        </div>
      </div>
    );
  }

  const currentBlock = allBlocks[currentIdx];
  const Comp = currentBlock ? COMPONENT_MAP[currentBlock.type] : null;

  return (
    <div style={{ background: B.card, border: `1px solid ${allDone ? B.ok : B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden", marginBottom: 20 }}>
      {/* Header */}
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: allDone ? B.okBg : "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke={allDone ? B.ok : B.blue} strokeWidth="1.3" /><path d="M5 7l2 2 4-4" stroke={allDone ? B.ok : B.blue} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: allDone ? B.ok : B.navy, textTransform: "uppercase", letterSpacing: .8 }}>
            {allDone ? "Assessment Complete" : "Assessment"}
          </span>
        </div>
        <span style={{ fontSize: 10, color: B.t3 }}>{completedCount}/{allBlocks.length} blocks</span>
      </div>

      {/* No-research notice */}
      {!allDone && (
        <div style={{ padding: "10px 18px", background: B.blueL, borderBottom: `1px solid ${B.bdr}`, fontSize: 12, color: B.navy, lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>&#x1F4CB;</span>
          <span>Answer based on what you've learned this week. Please don't research questions before answering. The goal of this check is to calibrate where your understanding is right now, so your manager can target the next sprint of learning. There's no penalty for getting things wrong.</span>
        </div>
      )}

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 4, padding: "10px 18px" }}>
        {allBlocks.map((b, i) => {
          const isDone = !!blockResults[b.id];
          const isCurrent = i === currentIdx;
          return (
            <div key={b.id + "_" + i} onClick={() => { if (isDone || i <= currentIdx) setCurrentIdx(i); }}
              style={{
                flex: 1, height: 4, borderRadius: 2, cursor: isDone || i <= currentIdx ? "pointer" : "default",
                background: isDone ? B.ok : isCurrent ? B.blue : B.bdr, transition: "background .3s",
              }} />
          );
        })}
      </div>

      {/* Module score summary */}
      {allDone && (
        <div style={{ padding: "16px 18px", textAlign: "center" }}>
          {(() => {
            const scores = allBlocks.map(b => blockResults[b.id]?.score ?? 0);
            const moduleScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            const passed = moduleScore >= PASS_THRESHOLD;
            return (
              <>
                <div style={{ fontSize: 20, fontWeight: 700, color: passed ? B.ok : B.err, marginBottom: 4 }}>
                  {Math.round(moduleScore * 100)}%
                </div>
                <div style={{ fontSize: 13, color: passed ? B.ok : B.err, fontWeight: 600, marginBottom: 4 }}>
                  {passed ? "Passed" : "Not Passed"} (75% required)
                </div>
                <div style={{ fontSize: 11, color: B.t3 }}>
                  {allBlocks.length} block{allBlocks.length !== 1 ? "s" : ""} completed
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Current block */}
      {!allDone && Comp && (
        <div style={{ padding: "0 18px 18px" }}>
          {blockResults[currentBlock.id] ? (
            <div style={{ padding: "14px", textAlign: "center", color: B.ok, fontSize: 12, fontWeight: 600 }}>
              Block completed (Score: {Math.round((blockResults[currentBlock.id].score || 0) * 100)}%)
              {currentIdx < allBlocks.length - 1 && (
                <button onClick={() => setCurrentIdx(prev => prev + 1)}
                  style={{ marginLeft: 12, padding: "6px 14px", border: "none", borderRadius: 6, background: B.blue, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Next
                </button>
              )}
            </div>
          ) : (
            <Comp block={currentBlock} onComplete={handleBlockComplete(currentBlock)} />
          )}
        </div>
      )}
    </div>
  );
}

function AssessmentAdminView({ blocks, sectionId, userId, onToggleLock }) {
  const [stored, setStored] = useState(null);
  const [confirmReopen, setConfirmReopen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const key = `assessment:${userId}:${sectionId}`;
        const d = await storage.get(key);
        if (d) setStored(JSON.parse(d.value || d));
      } catch {}
    })();
  }, [userId, sectionId]);

  const hasResults = stored && stored.blocks?.length > 0;
  const isLocked = stored && stored.locked !== false;
  const isReopenPending = stored && stored.locked === false && stored.attemptHistory?.length > 0;

  const handleToggleLock = async () => {
    if (!onToggleLock) return;
    await onToggleLock(sectionId, userId);
    // Re-read to update local state
    try {
      const key = `assessment:${userId}:${sectionId}`;
      const d = await storage.get(key);
      if (d) setStored(JSON.parse(d.value || d));
    } catch {}
    setConfirmReopen(false);
  };

  return (
    <div style={{ background: B.card, border: `1px solid ${hasResults ? B.ok : B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: hasResults ? B.okBg : "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke={hasResults ? B.ok : B.blue} strokeWidth="1.3" /><path d="M5 7l2 2 4-4" stroke={hasResults ? B.ok : B.blue} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: hasResults ? B.ok : B.navy, textTransform: "uppercase", letterSpacing: .8 }}>Assessment Results</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: B.t3, background: "#f1f5f9", padding: "2px 8px", borderRadius: 10 }}>Read Only</span>
      </div>

      {!hasResults ? (
        <div style={{ padding: "24px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: B.t3 }}>Not yet attempted</div>
          <div style={{ fontSize: 11, color: B.t3, marginTop: 4 }}>{blocks.length} block{blocks.length !== 1 ? "s" : ""} in this assessment</div>
        </div>
      ) : (
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: stored.passed ? B.ok : B.err }}>
              {Math.round((stored.moduleScore || 0) * 100)}%
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: stored.passed ? B.ok : B.err }}>
                {stored.passed ? "Passed" : "Not Passed"}
              </div>
              {stored.needsAdminReview && (
                <div style={{ fontSize: 10, fontWeight: 600, color: B.err, background: "#fef2f2", padding: "2px 6px", borderRadius: 4, marginTop: 2 }}>
                  Confident miss detected
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stored.blocks.map((br, i) => {
              const blockDef = blocks.find(b => b.id === br.blockId);
              const scoreColor = br.score >= 0.75 ? B.ok : br.score >= 0.5 ? B.warn : B.err;
              return (
                <div key={br.blockId} style={{ padding: "8px 12px", border: `1px solid ${B.bdr}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: B.t3, marginRight: 6 }}>{blockDef?.type?.replace(/_/g, " ") || "Block"}</span>
                    <span style={{ fontSize: 11, color: B.t1 }}>{blockDef?.title || blockDef?.question || `Block ${i + 1}`}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>{Math.round(br.score * 100)}%</span>
                </div>
              );
            })}
          </div>

          {/* Lock controls */}
          {onToggleLock && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${B.bdr}` }}>
              {isReopenPending ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="4" y="7" width="8" height="7" rx="1.5" stroke={B.warn} strokeWidth="1.3" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke={B.warn} strokeWidth="1.3" strokeLinecap="round" /><circle cx="12" cy="5" r="3" fill={B.warn} /></svg>
                  <span style={{ fontSize: 11, fontWeight: 600, color: B.warn }}>Retake allowed — awaiting trainee submission</span>
                  {stored.attemptHistory && <span style={{ fontSize: 10, color: B.t3, marginLeft: 4 }}>({stored.attemptHistory.length} attempt{stored.attemptHistory.length !== 1 ? "s" : ""} on record)</span>}
                </div>
              ) : isLocked && !confirmReopen ? (
                <button onClick={() => setConfirmReopen(true)}
                  style={{ padding: "6px 14px", border: `1px solid ${B.warn}`, borderRadius: 6, background: "#fffbeb", color: B.warn, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Allow Retake
                </button>
              ) : isLocked && confirmReopen ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: B.t2 }}>This allows the trainee to retake. Their current grade is preserved in history.</span>
                  <button onClick={handleToggleLock}
                    style={{ padding: "5px 12px", border: "none", borderRadius: 6, background: B.warn, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                    Confirm
                  </button>
                  <button onClick={() => setConfirmReopen(false)}
                    style={{ padding: "5px 12px", border: `1px solid ${B.bdr}`, borderRadius: 6, background: "#fff", color: B.t3, fontSize: 11, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
