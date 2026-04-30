import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { B } from "../../lib/brand.js";

function SortableItem({ id, label, isCorrect, isSubmitted }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled: isSubmitted });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "10px 14px",
    border: `2px solid ${isSubmitted ? (isCorrect ? B.ok : B.err) : B.bdr}`,
    borderRadius: 8,
    background: isSubmitted ? (isCorrect ? B.okBg : "#fef2f2") : "#fff",
    fontSize: 12,
    color: B.t1,
    cursor: isSubmitted ? "default" : "grab",
    display: "flex",
    alignItems: "center",
    gap: 10,
    userSelect: "none",
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: isSubmitted ? 0.3 : 0.5 }}>
        <path d="M4 4h1M4 8h1M4 12h1M11 4h1M11 8h1M11 12h1" stroke={B.t3} strokeWidth="2" strokeLinecap="round" />
      </svg>
      {label}
      {isSubmitted && isCorrect && <span style={{ marginLeft: "auto", fontSize: 10, color: B.ok, fontWeight: 600 }}>Correct</span>}
      {isSubmitted && !isCorrect && <span style={{ marginLeft: "auto", fontSize: 10, color: B.err, fontWeight: 600 }}>Wrong position</span>}
    </div>
  );
}

function OrderMode({ block, onComplete }) {
  const [items, setItems] = useState(() => {
    // Shuffle items
    const shuffled = [...block.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const [submitted, setSubmitted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    if (submitted) return;
    const { active, over } = event;
    if (active.id !== over?.id) {
      setItems(prev => {
        const oldIndex = prev.findIndex(i => i.id === active.id);
        const newIndex = prev.findIndex(i => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correctCount = items.filter((item, i) => item.id === block.correctSequence[i]).length;
    const score = block.correctSequence.length > 0 ? correctCount / block.correctSequence.length : 1;
    onComplete(score, { order: items.map(i => i.id) }, { type: "DRAG_EXERCISE", id: block.id });
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((item, idx) => (
              <SortableItem key={item.id} id={item.id} label={item.label}
                isSubmitted={submitted}
                isCorrect={submitted && item.id === block.correctSequence[idx]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {submitted && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: B.blueL, border: `1px solid ${B.blueM}`, fontSize: 12, color: B.t1, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 11, color: B.blue }}>Correct Order:</div>
          {block.correctSequence.map((id, i) => {
            const item = block.items.find(it => it.id === id);
            return <div key={id} style={{ fontSize: 11, color: B.t2 }}>{i + 1}. {item?.label}</div>;
          })}
          {block.explanation && <div style={{ marginTop: 8, fontSize: 11, color: B.t2 }}>{block.explanation}</div>}
        </div>
      )}

      {!submitted && (
        <button onClick={handleSubmit} style={{ marginTop: 14, padding: "8px 20px", border: "none", borderRadius: 7, background: B.blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          Submit Order
        </button>
      )}
    </>
  );
}

function MatchMode({ block, onComplete }) {
  const [matches, setMatches] = useState({}); // { aId: bId }
  const [selectedA, setSelectedA] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const allB = [...block.pairs.map(p => p.b), ...(block.decoys || [])];
  // Shuffle B items
  const [shuffledB] = useState(() => {
    const arr = [...allB];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  const correctMap = {};
  for (const pair of block.pairs) correctMap[pair.a.id] = pair.b.id;

  const handleClickA = (aId) => {
    if (submitted) return;
    setSelectedA(selectedA === aId ? null : aId);
  };

  const handleClickB = (bId) => {
    if (submitted || !selectedA) return;
    setMatches(prev => ({ ...prev, [selectedA]: bId }));
    setSelectedA(null);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correctCount = block.pairs.filter(p => matches[p.a.id] === p.b.id).length;
    const score = block.pairs.length > 0 ? correctCount / block.pairs.length : 1;
    onComplete(score, { matches }, { type: "DRAG_EXERCISE", id: block.id });
  };

  const matchedBIds = new Set(Object.values(matches));

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Column A */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: B.t3, marginBottom: 4 }}>Items</div>
          {block.pairs.map(p => {
            const isSelected = selectedA === p.a.id;
            const isMatched = p.a.id in matches;
            const isCorrect = submitted && matches[p.a.id] === correctMap[p.a.id];
            const isWrong = submitted && isMatched && !isCorrect;
            return (
              <div key={p.a.id} onClick={() => handleClickA(p.a.id)}
                style={{
                  padding: "10px 14px", borderRadius: 8, fontSize: 12, cursor: submitted ? "default" : "pointer",
                  border: `2px solid ${submitted ? (isCorrect ? B.ok : isWrong ? B.err : B.bdr) : isSelected ? B.blue : isMatched ? B.blueM : B.bdr}`,
                  background: submitted ? (isCorrect ? B.okBg : isWrong ? "#fef2f2" : "#fff") : isSelected ? B.blueL : "#fff",
                  color: B.t1, transition: "all .2s",
                }}>
                {p.a.label}
                {isMatched && !submitted && (
                  <span style={{ fontSize: 10, color: B.blue, marginLeft: 6 }}>→ {shuffledB.find(b => b.id === matches[p.a.id])?.label}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Column B */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: B.t3, marginBottom: 4 }}>Matches</div>
          {shuffledB.map(b => {
            const isUsed = matchedBIds.has(b.id);
            const isDecoy = block.decoys?.some(d => d.id === b.id);
            return (
              <div key={b.id} onClick={() => handleClickB(b.id)}
                style={{
                  padding: "10px 14px", borderRadius: 8, fontSize: 12,
                  cursor: submitted || !selectedA ? "default" : "pointer",
                  border: `2px solid ${isUsed && !submitted ? B.blueM : B.bdr}`,
                  background: submitted && isDecoy && isUsed ? "#fef2f2" : isUsed ? B.blueL : "#fff",
                  color: B.t1, opacity: isUsed && !submitted ? 0.6 : 1, transition: "all .2s",
                }}>
                {b.label}
              </div>
            );
          })}
        </div>
      </div>

      {submitted && block.explanation && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: B.blueL, border: `1px solid ${B.blueM}`, fontSize: 12, color: B.t1, lineHeight: 1.6 }}>
          {block.explanation}
        </div>
      )}

      {!submitted && (
        <button onClick={handleSubmit} disabled={Object.keys(matches).length < block.pairs.length}
          style={{
            marginTop: 14, padding: "8px 20px", border: "none", borderRadius: 7,
            background: Object.keys(matches).length >= block.pairs.length ? B.blue : B.bdr,
            color: "#fff", fontSize: 12, fontWeight: 600,
            cursor: Object.keys(matches).length >= block.pairs.length ? "pointer" : "default",
            fontFamily: "inherit",
          }}>
          Submit Matches
        </button>
      )}
    </>
  );
}

export default function DragExercise({ block, onComplete }) {
  return (
    <div style={{ background: B.card, border: `1px solid ${B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 3h8M4 8h8M4 13h8" stroke={B.blue} strokeWidth="1.3" strokeLinecap="round" /><circle cx="2" cy="3" r="1" fill={B.blue} /><circle cx="2" cy="8" r="1" fill={B.blue} /><circle cx="2" cy="13" r="1" fill={B.blue} /></svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>
          {block.mode === "order" ? "Put in Order" : "Match Items"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: B.t3 }}>{block.title}</span>
      </div>

      <div style={{ padding: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: B.navy, lineHeight: 1.5, marginTop: 0, marginBottom: 14 }}>{block.prompt}</p>
        {block.mode === "order" ? (
          <OrderMode block={block} onComplete={onComplete} />
        ) : (
          <MatchMode block={block} onComplete={onComplete} />
        )}
      </div>
    </div>
  );
}
