import { useState, useEffect } from "react";
import { B } from "../../lib/brand.js";
import { TOPIC_TAGS, CATEGORIES } from "../../data/topicTags.js";
import { getMasteryMap } from "../../lib/spacedRepetition.js";

const STATE_COLORS = {
  mastered: B.ok,
  in_progress: B.blue,
  weak: B.warn,
  never_seen: "#d1d5db",
};

const STATE_BG = {
  mastered: B.okL,
  in_progress: B.blueL,
  weak: B.warnL,
  never_seen: "#f9fafb",
};

export default function CohortHeatmap({ trainees }) {
  const [masteryData, setMasteryData] = useState({}); // { [userId]: masteryMap }
  const [expandedCats, setExpandedCats] = useState({});
  const [filterCat, setFilterCat] = useState("All");
  const [filterState, setFilterState] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all(
      trainees.map(async t => {
        const m = await getMasteryMap(t.id);
        return [t.id, m || {}];
      })
    ).then(results => {
      setMasteryData(Object.fromEntries(results));
    });
  }, [trainees]);

  const filteredTrainees = trainees.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  const visibleCategories = filterCat === "All" ? CATEGORIES : [filterCat];

  return (
    <div style={{ background: B.card, border: `1px solid ${B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke={B.blue} strokeWidth="1.3" /><rect x="3" y="3" width="4" height="4" rx="1" fill={B.ok} opacity=".6" /><rect x="9" y="3" width="4" height="4" rx="1" fill={B.warn} opacity=".6" /><rect x="3" y="9" width="4" height="4" rx="1" fill={B.blue} opacity=".6" /><rect x="9" y="9" width="4" height="4" rx="1" fill="#d1d5db" opacity=".6" /></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>Cohort Topics</span>
        </div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "Mastered", color: B.ok },
            { label: "In Progress", color: B.blue },
            { label: "Weak", color: B.warn },
            { label: "Not Seen", color: "#d1d5db" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 9, color: B.t3 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: "10px 18px", borderBottom: `1px solid ${B.bdr}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search trainee..."
          style={{ padding: "5px 10px", border: `1px solid ${B.bdr}`, borderRadius: 6, fontSize: 11, fontFamily: "'DM Sans',sans-serif", width: 140 }}
        />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ padding: "5px 8px", border: `1px solid ${B.bdr}`, borderRadius: 6, fontSize: 11, fontFamily: "'DM Sans',sans-serif", background: "#fff" }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterState} onChange={e => setFilterState(e.target.value)}
          style={{ padding: "5px 8px", border: `1px solid ${B.bdr}`, borderRadius: 6, fontSize: 11, fontFamily: "'DM Sans',sans-serif", background: "#fff" }}>
          <option value="All">All States</option>
          <option value="mastered">Mastered</option>
          <option value="in_progress">In Progress</option>
          <option value="weak">Weak</option>
          <option value="never_seen">Not Seen</option>
        </select>
      </div>

      {/* Heatmap grid */}
      <div style={{ overflowX: "auto", padding: "0 0 8px" }}>
        {visibleCategories.map(cat => {
          const catTags = TOPIC_TAGS.filter(t => t.category === cat);
          const isExpanded = !!expandedCats[cat];

          return (
            <div key={cat}>
              {/* Category header row */}
              <button
                onClick={() => setExpandedCats(p => ({ ...p, [cat]: !p[cat] }))}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 18px", border: "none", borderBottom: `1px solid ${B.bdr}`,
                  background: "#f8fafc", cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                  fontSize: 11, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8,
                }}
              >
                <span>{cat} ({catTags.length} topics)</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transition: "transform .15s", transform: isExpanded ? "rotate(180deg)" : "none" }}>
                  <path d="M2 3.5l3 3 3-3" stroke={B.t3} strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>

              {isExpanded && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: catTags.length * 40 + 160 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "6px 18px", fontSize: 10, fontWeight: 600, color: B.t3, textAlign: "left", position: "sticky", left: 0, background: "#fff", zIndex: 1, borderBottom: `1px solid ${B.bdr}` }}>
                          Trainee
                        </th>
                        {catTags.map(tag => (
                          <th key={tag.id} title={tag.description}
                            style={{ padding: "6px 4px", fontSize: 9, fontWeight: 600, color: B.t3, textAlign: "center", borderBottom: `1px solid ${B.bdr}`, whiteSpace: "nowrap", maxWidth: 60 }}>
                            <div style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", height: 50, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {tag.label}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrainees.map(t => (
                        <tr key={t.id}>
                          <td style={{ padding: "6px 18px", fontSize: 11, fontWeight: 600, color: B.t1, position: "sticky", left: 0, background: "#fff", zIndex: 1, borderBottom: `1px solid ${B.bdr}` }}>
                            {t.name}
                          </td>
                          {catTags.map(tag => {
                            const state = masteryData[t.id]?.[tag.id] || "never_seen";
                            if (filterState !== "All" && state !== filterState) {
                              return <td key={tag.id} style={{ padding: 4, textAlign: "center", borderBottom: `1px solid ${B.bdr}` }}>
                                <div style={{ width: 16, height: 16, borderRadius: 3, background: "#f9fafb", margin: "0 auto" }} />
                              </td>;
                            }
                            return (
                              <td key={tag.id} style={{ padding: 4, textAlign: "center", borderBottom: `1px solid ${B.bdr}` }}>
                                <div
                                  title={`${t.name}: ${tag.label} — ${state.replace(/_/g, " ")}`}
                                  style={{
                                    width: 16, height: 16, borderRadius: 3,
                                    background: STATE_BG[state],
                                    border: `1.5px solid ${STATE_COLORS[state]}`,
                                    margin: "0 auto",
                                  }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
