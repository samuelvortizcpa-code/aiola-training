import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ─── Training Data ───────────────────────────────────────────────────────────

const PHASES = [
  {
    id: "week1", label: "Week 1", subtitle: "Foundation & Setup", phase: "Days 1–30",
    items: [
      {
        id: "d1", title: "Day 1 — Environment Setup",
        description: "Get your workspace configured and ready to go.",
        tasks: [
          { id: "d1t1", text: "Complete IT onboarding: laptop, monitors, peripherals" },
          { id: "d1t2", text: "Set up Microsoft 365 account and email signature" },
          { id: "d1t3", text: "Change all default passwords (email, VPN, systems)" },
          { id: "d1t4", text: "Configure multi-factor authentication on all accounts" },
          { id: "d1t5", text: "Join all required Slack/Teams channels" },
          { id: "d1t6", text: "Review the Aiola CPA Employee Handbook (link in Resources)" },
        ],
        resources: [{ label: "Employee Handbook", url: "#" }, { label: "IT Setup Checklist", url: "#" }],
        quiz: {
          question: "What is the first thing you should do after receiving your laptop?",
          options: ["Start reviewing client files", "Change all default passwords and enable MFA", "Set up your email signature", "Join Slack channels"],
          correct: 1,
        },
      },
      {
        id: "d2", title: "Day 2 — ClickUp Mastery",
        description: "Learn our project management system inside and out.",
        tasks: [
          { id: "d2t1", text: "Complete ClickUp University onboarding course (Sections 1–4)" },
          { id: "d2t2", text: "Set up your personal ClickUp workspace and views" },
          { id: "d2t3", text: "Learn the Aiola task naming conventions and status flows" },
          { id: "d2t4", text: "Practice creating, assigning, and closing tasks" },
          { id: "d2t5", text: "Review the team's current active project board" },
        ],
        resources: [{ label: "ClickUp University", url: "#" }, { label: "Aiola ClickUp SOP", url: "#" }],
        quiz: {
          question: "In Aiola's ClickUp workflow, what status should a task be moved to when you've completed your work but it needs a manager review?",
          options: ["Done", "In Review", "Closed", "Pending Client"],
          correct: 1,
        },
      },
      {
        id: "d3", title: "Day 3 — Front (Client Communication)",
        description: "Master the team inbox and client communication protocols.",
        tasks: [
          { id: "d3t1", text: "Complete Front Academy introductory modules" },
          { id: "d3t2", text: "Learn shared inbox etiquette and assignment rules" },
          { id: "d3t3", text: "Review Aiola's email response templates and tone guide" },
          { id: "d3t4", text: "Practice drafting a client follow-up email (do not send)" },
          { id: "d3t5", text: "Understand escalation paths: when to loop in a senior advisor" },
        ],
        resources: [{ label: "Front Academy", url: "#" }, { label: "Email Template Library", url: "#" }, { label: "Communication Tone Guide", url: "#" }],
        quiz: {
          question: "When should you escalate a client email to a senior advisor?",
          options: ["Whenever you're unsure about anything", "Only when the client explicitly asks for a manager", "When the issue involves tax strategy decisions, compliance risk, or client dissatisfaction", "Never — handle everything independently"],
          correct: 2,
        },
      },
      {
        id: "d4", title: "Day 4 — The Aiola Way",
        description: "Deep dive into our firm's culture, services, and team structure.",
        tasks: [
          { id: "d4t1", text: "Review the Aiola CPA service packages (Tax Prep, Advisory, Premium)" },
          { id: "d4t2", text: "Learn the advisory engagement lifecycle: onboarding → ISM → TSR → checkups" },
          { id: "d4t3", text: "Meet the team: review org chart and each person's role" },
          { id: "d4t4", text: "Understand firm KPIs and how your role contributes" },
          { id: "d4t5", text: "Review the 2026 firm goals and quarterly milestones" },
        ],
        resources: [{ label: "Service Package Overview", url: "#" }, { label: "Org Chart & Team Directory", url: "#" }, { label: "2026 Firm Goals", url: "#" }],
        quiz: {
          question: "What is the correct order of the advisory engagement lifecycle?",
          options: ["ISM → Onboarding → TSR → Checkups", "Onboarding → ISM → TSR → Checkups", "TSR → ISM → Onboarding → Checkups", "Onboarding → TSR → ISM → Checkups"],
          correct: 1,
        },
      },
      {
        id: "d5", title: "Day 5 — Week 1 Wrap-Up",
        description: "Consolidate everything and prepare for technical training next week.",
        tasks: [
          { id: "d5t1", text: "Complete the Week 1 self-assessment questionnaire" },
          { id: "d5t2", text: "Document any outstanding questions for your manager" },
          { id: "d5t3", text: "Ensure all systems are working: ClickUp, Front, email, calendar" },
          { id: "d5t4", text: "Review next week's technical training schedule" },
          { id: "d5t5", text: "Submit your Week 1 recap to your manager via ClickUp" },
        ],
        resources: [{ label: "Week 1 Self-Assessment", url: "#" }, { label: "Week 2 Preview", url: "#" }],
        quiz: {
          question: "By the end of Week 1, which of the following should be fully complete?",
          options: ["Your first client advisory meeting", "All system setups, firm orientation, and ClickUp/Front training", "A full tax return review", "Your 90-day performance review"],
          correct: 1,
        },
      },
    ],
  },
  {
    id: "week2", label: "Week 2", subtitle: "Tax Foundations", phase: "Days 1–30",
    items: [{
      id: "w2", title: "Week 2 — Individual Tax Return Fundamentals",
      description: "Build fluency with 1040s, schedules, and common client scenarios.",
      tasks: [
        { id: "w2t1", text: "Review Form 1040 structure: income, adjustments, deductions, credits, tax computation" },
        { id: "w2t2", text: "Complete practice return #1: W-2 employee with standard deduction" },
        { id: "w2t3", text: "Study Schedule C: sole proprietorship income, expenses, and SE tax" },
        { id: "w2t4", text: "Study Schedule E: rental real estate income and loss" },
        { id: "w2t5", text: "Review Aiola's tax return review checklist" },
        { id: "w2t6", text: "Shadow a senior advisor's return review session (observe only)" },
      ],
      resources: [{ label: "1040 Study Guide", url: "#" }, { label: "Practice Return #1 (PDF)", url: "#" }, { label: "Tax Return Review Checklist", url: "#" }],
      quiz: { question: "On a Form 1040, where does rental real estate income or loss appear?", options: ["Schedule C, Line 31", "Schedule E, Part I", "Schedule D, Part II", "Form 8949"], correct: 1 },
    }],
  },
  {
    id: "week3", label: "Week 3", subtitle: "Entity & Strategy Basics", phase: "Days 1–30",
    items: [{
      id: "w3", title: "Week 3 — Entity Structures & Advisory Concepts",
      description: "Understand LLCs, S-Corps, and how advisory clients are different from tax prep.",
      tasks: [
        { id: "w3t1", text: "Study entity types: Sole Prop, SMLLC, Partnership, S-Corp, C-Corp" },
        { id: "w3t2", text: "Learn S-Corp election criteria and reasonable salary rules" },
        { id: "w3t3", text: "Review the Wyoming Holding LLC strategy and when to recommend it" },
        { id: "w3t4", text: "Understand the difference between tax prep and tax advisory engagements" },
        { id: "w3t5", text: "Complete practice scenario: recommend an entity structure for a coaching business at $80K net" },
        { id: "w3t6", text: "Review 3 past ISM transcript excerpts on entity structure discussions" },
      ],
      resources: [{ label: "Entity Structure Guide", url: "#" }, { label: "S-Corp Decision Framework", url: "#" }, { label: "ISM Transcript Excerpts", url: "#" }],
      quiz: { question: "At what approximate net income level does S-Corp election typically start making sense for a sole proprietor?", options: ["$25,000–$40,000", "$50,000–$60,000", "$75,000–$100,000+", "Any income level"], correct: 2 },
    }],
  },
  {
    id: "week4", label: "Week 4", subtitle: "Real Estate Tax Strategy", phase: "Days 1–30",
    items: [{
      id: "w4", title: "Week 4 — Short-Term Rental & Real Estate Strategies",
      description: "Master the STR loophole, cost segregation, and material participation.",
      tasks: [
        { id: "w4t1", text: "Study IRC §469 passive activity rules and the 7-day average stay exception" },
        { id: "w4t2", text: "Learn the 3 material participation tests relevant to STRs (100hrs, more-than-anyone, 500hrs)" },
        { id: "w4t3", text: "Understand cost segregation studies: what they are, when to recommend, ROI" },
        { id: "w4t4", text: "Review bonus depreciation rules and phase-down schedule (2023–2027)" },
        { id: "w4t5", text: "Complete the STR Loophole case study with the Rivera mock client" },
        { id: "w4t6", text: "Quiz: Calculate the tax savings from reclassifying a rental loss as non-passive" },
      ],
      resources: [{ label: "STR Loophole Explainer", url: "#" }, { label: "Cost Seg ROI Calculator", url: "#" }, { label: "Rivera Case Study (PDF)", url: "#" }, { label: "Bonus Depreciation Schedule", url: "#" }],
      quiz: { question: "What is the key requirement to convert a short-term rental loss from passive to non-passive?", options: ["Own the property for at least 2 years", "Average guest stay ≤ 7 days + meet material participation (≥100 hrs, more than anyone else)", "File Schedule E Part II instead of Part I", "Elect Real Estate Professional Status"], correct: 1 },
    }],
  },
  {
    id: "week5_8", label: "Weeks 5–8", subtitle: "Applied Advisory", phase: "Days 31–60",
    items: [
      {
        id: "w5", title: "Week 5 — Mock ISM Preparation",
        description: "Prepare for and complete your first mock Initial Strategy Meeting.",
        tasks: [
          { id: "w5t1", text: "Review the ISM meeting structure: intro → expectations → return review → strategy → close" },
          { id: "w5t2", text: "Study the Advisory Onboarding Questionnaire template and what to look for" },
          { id: "w5t3", text: "Practice explaining cost segregation in plain language (record yourself)" },
          { id: "w5t4", text: "Complete the AI-powered Mock ISM simulation (Client Strategy Meeting tool)" },
          { id: "w5t5", text: "Review your mock ISM scorecard with your manager" },
        ],
        resources: [{ label: "ISM Meeting Framework", url: "#" }, { label: "Mock ISM Tool (Link)", url: "#" }, { label: "Scoring Rubric", url: "#" }],
        quiz: { question: "What is the FIRST thing a strong advisor does at the beginning of an ISM?", options: ["Jump straight into the tax return review", "Build rapport with small talk and set expectations for the meeting structure", "Ask the client to list all their tax questions", "Present the fee schedule"], correct: 1 },
      },
      {
        id: "w6", title: "Week 6 — Tax Strategy Roadmap (TSR) Training",
        description: "Learn to build and present a Tax Strategy Roadmap deliverable.",
        tasks: [
          { id: "w6t1", text: "Review 3 sample TSR documents from past advisory engagements" },
          { id: "w6t2", text: "Understand each section: executive summary, findings, recommendations, timeline" },
          { id: "w6t3", text: "Draft a practice TSR based on the Rivera mock client scenario" },
          { id: "w6t4", text: "Present your draft TSR to your manager (mock delivery)" },
          { id: "w6t5", text: "Incorporate feedback and finalize your practice TSR" },
        ],
        resources: [{ label: "Sample TSR #1", url: "#" }, { label: "Sample TSR #2", url: "#" }, { label: "TSR Template", url: "#" }],
        quiz: { question: "What is the primary purpose of the Tax Strategy Roadmap (TSR)?", options: ["To file the client's tax return", "To give the client a clear, actionable plan with prioritized strategies and a timeline", "To upsell the client on additional services", "To document the firm's internal notes"], correct: 1 },
      },
      {
        id: "w7", title: "Week 7 — Client Communication & Checkups",
        description: "Master the ongoing client relationship: checkup calls, time log reviews, and proactive outreach.",
        tasks: [
          { id: "w7t1", text: "Study the checkup meeting framework: what to cover and when" },
          { id: "w7t2", text: "Learn the time log review process for material participation tracking" },
          { id: "w7t3", text: "Practice a mock checkup call scenario with a peer" },
          { id: "w7t4", text: "Draft 3 proactive client outreach emails (year-end planning, estimated payments, entity deadline)" },
          { id: "w7t5", text: "Review the client escalation matrix: when to involve Nick" },
        ],
        resources: [{ label: "Checkup Meeting Template", url: "#" }, { label: "Time Log Template", url: "#" }, { label: "Email Outreach Templates", url: "#" }],
        quiz: { question: "How often should advisory clients ideally have a checkup call?", options: ["Only at year-end", "Quarterly, with flexibility based on complexity", "Monthly without exception", "Only when the client requests one"], correct: 1 },
      },
      {
        id: "w8", title: "Week 8 — Days 31–60 Checkpoint",
        description: "Formal mid-point review and self-assessment.",
        tasks: [
          { id: "w8t1", text: "Complete the 60-Day self-assessment questionnaire" },
          { id: "w8t2", text: "Prepare a summary of key learnings and areas for growth" },
          { id: "w8t3", text: "Schedule and complete your 60-Day review with Nick" },
          { id: "w8t4", text: "Set goals for Days 61–90 based on review feedback" },
          { id: "w8t5", text: "Begin shadowing live advisory meetings (observe + take notes)" },
        ],
        resources: [{ label: "60-Day Self-Assessment", url: "#" }, { label: "Performance Review Template", url: "#" }],
        quiz: { question: "By Day 60, which of the following should you have completed?", options: ["Led 5+ real client ISMs independently", "A mock ISM, a practice TSR, mock checkup call, and begun shadowing live meetings", "Closed your first advisory client sale", "Built your own tax strategy playbook"], correct: 1 },
      },
    ],
  },
  {
    id: "week9_12", label: "Weeks 9–12", subtitle: "Go Live", phase: "Days 61–90",
    items: [
      {
        id: "w9", title: "Week 9 — Supervised Live Meetings",
        description: "Lead your first real advisory meetings with senior advisor backup.",
        tasks: [
          { id: "w9t1", text: "Co-lead your first live ISM with a senior advisor present" },
          { id: "w9t2", text: "Debrief after each meeting: what went well, what to improve" },
          { id: "w9t3", text: "Draft your first real TSR from a live meeting" },
          { id: "w9t4", text: "Get TSR reviewed and approved before delivery" },
          { id: "w9t5", text: "Begin managing 2–3 advisory client relationships in ClickUp" },
        ],
        resources: [{ label: "Live Meeting Prep Checklist", url: "#" }, { label: "TSR Quality Checklist", url: "#" }],
        quiz: { question: "During your first supervised live ISM, what is your primary role?", options: ["Observe silently and take notes", "Lead the meeting while the senior advisor provides backup and may interject", "Handle only the administrative parts", "Present the fee schedule and close the sale"], correct: 1 },
      },
      {
        id: "w10", title: "Week 10 — Independent Client Management",
        description: "Take ownership of your advisory client portfolio.",
        tasks: [
          { id: "w10t1", text: "Lead an ISM independently (senior advisor reviews recording after)" },
          { id: "w10t2", text: "Manage all client communications in Front for your assigned clients" },
          { id: "w10t3", text: "Complete and deliver a TSR independently" },
          { id: "w10t4", text: "Conduct a checkup call with an existing advisory client" },
          { id: "w10t5", text: "Track your KPIs: meetings held, TSRs delivered, client satisfaction" },
        ],
        resources: [{ label: "KPI Tracking Dashboard", url: "#" }, { label: "Client Satisfaction Survey", url: "#" }],
        quiz: { question: "When managing your own client portfolio, how should you prioritize your weekly tasks?", options: ["Respond to emails first, then schedule meetings", "Upcoming deadlines first, then proactive outreach, then administrative tasks", "Work on whatever feels most urgent in the moment", "Focus exclusively on new client acquisition"], correct: 1 },
      },
      {
        id: "w11_12", title: "Weeks 11–12 — 90-Day Graduation",
        description: "Final review, goal-setting, and transition to full autonomy.",
        tasks: [
          { id: "w12t1", text: "Complete the 90-Day comprehensive self-assessment" },
          { id: "w12t2", text: "Prepare your 90-Day portfolio: all TSRs, meeting recordings, client feedback" },
          { id: "w12t3", text: "Present your 90-Day review to Nick and the advisory team" },
          { id: "w12t4", text: "Set 6-month performance goals collaboratively" },
          { id: "w12t5", text: "Transition to fully independent advisory role" },
          { id: "w12t6", text: "Complete the final certification quiz" },
        ],
        resources: [{ label: "90-Day Self-Assessment", url: "#" }, { label: "6-Month Goal Template", url: "#" }, { label: "Advisory Certification Checklist", url: "#" }],
        quiz: { question: "At the end of 90 days, a fully onboarded advisor should be able to:", options: ["Handle only tax prep returns independently", "Lead ISMs, build and deliver TSRs, manage client relationships, and track KPIs — all independently", "Shadow senior advisors on all meetings", "Focus exclusively on sales calls"], correct: 1 },
      },
    ],
  },
];

// ─── Demo Users ──────────────────────────────────────────────────────────────

const MOCK_TRAINEES = [
  { id: "chris_m", name: "Chris Martinez", email: "chris.martinez@aiolacpa.com", role: "trainee", startDate: "2026-04-21", track: "Advisory", avatar: "CM" },
  { id: "sarah_k", name: "Sarah Kim", email: "sarah.kim@aiolacpa.com", role: "trainee", startDate: "2026-04-21", track: "Advisory", avatar: "SK" },
  { id: "james_p", name: "James Powell", email: "james.powell@aiolacpa.com", role: "trainee", startDate: "2026-05-05", track: "Advisory", avatar: "JP" },
];
const MOCK_ADMINS = [
  { id: "nick_a", name: "Nick Aiola", email: "nick@aiolacpa.com", role: "admin", avatar: "NA" },
  { id: "sam_o", name: "Sam Ortiz", email: "sam@aiolacpa.com", role: "admin", avatar: "SO" },
];

const SEED_DATA = {
  chris_m: { tasks: { d1t1:true,d1t2:true,d1t3:true,d1t4:true,d1t5:true,d1t6:true,d2t1:true,d2t2:true,d2t3:true,d3t1:true,d3t2:true }, quizzes: { d1:true, d2:true } },
  sarah_k: { tasks: { d1t1:true,d1t2:true,d1t3:true }, quizzes: { d1:true } },
};

// ─── Brand Tokens ────────────────────────────────────────────────────────────

const B = {
  blue: "#3B8DD0", blueD: "#2C6FA8", blueL: "#EBF4FB", blueM: "#A8D0F0",
  navy: "#1a1a2e", bg: "#f5f7fa", card: "#fff", bdr: "#e2e8f0",
  t1: "#1a1a2e", t2: "#5a6577", t3: "#8896a6",
  ok: "#22c55e", okL: "#dcfce7", okBg: "#f0fdf4",
  warn: "#f59e0b", warnL: "#fef3c7",
  err: "#ef4444", purple: "#7c3aed", purpleL: "#ede9fe",
};

// ─── Shared Icons ────────────────────────────────────────────────────────────

const Logo = ({ size = 36 }) => (
  <svg width={size} height={size * 0.85} viewBox="0 0 120 102" fill="none">
    <path d="M30 70 L60 20 L90 70 Z" fill="none" stroke={B.blue} strokeWidth="5" strokeLinejoin="round"/>
    <rect x="52" y="45" width="16" height="25" fill="none" stroke={B.blue} strokeWidth="4"/>
    <line x1="15" y1="70" x2="105" y2="70" stroke={B.blue} strokeWidth="5"/>
    <line x1="70" y1="55" x2="100" y2="55" stroke={B.blue} strokeWidth="4"/>
    <line x1="80" y1="45" x2="100" y2="45" stroke={B.blue} strokeWidth="4"/>
    <line x1="80" y1="65" x2="100" y2="65" stroke={B.blue} strokeWidth="3"/>
    <text x="60" y="92" textAnchor="middle" fontFamily="'DM Sans',sans-serif" fontSize="11" fontWeight="700" fill={B.blue} letterSpacing="1.5">AIOLA CPA</text>
  </svg>
);
const Chk = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const Chev = ({ open }) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: open?"rotate(90deg)":"rotate(0)",transition:"transform .2s" }}><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const BookIc = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h4.5c1 0 1.5.5 1.5 1.5v10c0-.83-.67-1.5-1.5-1.5H2V2z" stroke="currentColor" strokeWidth="1.5"/><path d="M14 2H9.5C8.5 2 8 2.5 8 3.5v10c0-.83.67-1.5 1.5-1.5H14V2z" stroke="currentColor" strokeWidth="1.5"/></svg>;
const QuizIc = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/><text x="8" y="11" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">?</text></svg>;
const Trophy = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 3h8v5a4 4 0 01-8 0V3z" stroke="#f59e0b" strokeWidth="1.5"/><path d="M6 5H3.5a1 1 0 00-1 1v1a3 3 0 003 3H6" stroke="#f59e0b" strokeWidth="1.5"/><path d="M14 5h2.5a1 1 0 011 1v1a3 3 0 01-3 3H14" stroke="#f59e0b" strokeWidth="1.5"/><line x1="10" y1="12" x2="10" y2="15" stroke="#f59e0b" strokeWidth="1.5"/><line x1="7" y1="15" x2="13" y2="15" stroke="#f59e0b" strokeWidth="1.5"/></svg>;
const MsftIc = () => <svg width="20" height="20" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>;
const Ring = ({ pct, size = 44, stroke = 4 }) => {
  const r = (size-stroke)/2, c = 2*Math.PI*r;
  return <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={B.bdr} strokeWidth={stroke}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={pct===100?B.ok:B.blue} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c*(1-pct/100)} strokeLinecap="round" style={{transition:"stroke-dashoffset .5s"}}/></svg>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const totalTasks = PHASES.reduce((a,p)=>a+p.items.reduce((b,i)=>b+i.tasks.length,0),0);
const totalQuizzes = PHASES.reduce((a,p)=>a+p.items.length,0);
const calcProg = (ts,qs) => { const d=Object.values(ts||{}).filter(Boolean).length,p=Object.values(qs||{}).filter(Boolean).length; return{doneTasks:d,passedQuizzes:p,pct:totalTasks>0?Math.round(d/totalTasks*100):0}; };
const phaseProg = (phase,ts) => { const a=phase.items.flatMap(i=>i.tasks),d=a.filter(t=>ts?.[t.id]).length; return a.length?Math.round(d/a.length*100):0; };
const itemProg = (item,ts) => { const d=item.tasks.filter(t=>ts?.[t.id]).length; return item.tasks.length?Math.round(d/item.tasks.length*100):0; };
const daysSince = s => Math.max(0,Math.floor((new Date()-new Date(s))/864e5));
const pMeta = [{ids:["week1","week2","week3","week4"],label:"Days 1–30",color:B.blue},{ids:["week5_8"],label:"Days 31–60",color:B.purple},{ids:["week9_12"],label:"Days 61–90",color:B.ok}];

// ═════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════

function LoginScreen({ onLogin }) {
  const [showDemo, setShowDemo] = useState(false);
  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${B.navy} 0%,#0f172a 50%,#1e293b 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:24}}>
      <div style={{position:"fixed",inset:0,opacity:.03,backgroundImage:`linear-gradient(${B.blue} 1px,transparent 1px),linear-gradient(90deg,${B.blue} 1px,transparent 1px)`,backgroundSize:"40px 40px"}}/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:440}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:14,marginBottom:12}}>
            <Logo size={44}/>
            <div style={{textAlign:"left"}}>
              <div style={{fontWeight:700,fontSize:18,color:"#fff",letterSpacing:.5}}>AIOLA CPA, PLLC</div>
              <div style={{fontSize:12,color:B.blueM,marginTop:2}}>Advisory Training Portal</div>
            </div>
          </div>
        </div>
        <div style={{background:"#fff",borderRadius:16,padding:"36px 32px",boxShadow:"0 25px 50px rgba(0,0,0,.25)"}}>
          <h2 style={{margin:"0 0 6px",fontSize:22,fontWeight:700,color:B.navy,textAlign:"center"}}>Welcome Back</h2>
          <p style={{margin:"0 0 28px",fontSize:13,color:B.t3,textAlign:"center"}}>Sign in with your Aiola CPA credentials</p>
          <button onClick={()=>setShowDemo(true)} style={{width:"100%",padding:"14px 20px",border:`1px solid ${B.bdr}`,borderRadius:10,background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600,color:B.t1,display:"flex",alignItems:"center",justifyContent:"center",gap:12,transition:"all .2s",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}
            onMouseEnter={e=>{e.currentTarget.style.background="#f8f9fa";e.currentTarget.style.borderColor=B.blue}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor=B.bdr}}>
            <MsftIc/> Sign in with Microsoft
          </button>
          <div style={{display:"flex",alignItems:"center",gap:12,margin:"20px 0"}}>
            <div style={{flex:1,height:1,background:B.bdr}}/><span style={{fontSize:11,color:B.t3,textTransform:"uppercase",letterSpacing:1}}>Demo Access</span><div style={{flex:1,height:1,background:B.bdr}}/>
          </div>
          {!showDemo ? (
            <button onClick={()=>setShowDemo(true)} style={{width:"100%",padding:"12px",border:`1px dashed ${B.blueM}`,borderRadius:10,background:B.blueL,cursor:"pointer",fontFamily:"inherit",fontSize:13,color:B.blue,fontWeight:500}}>
              Select a demo account to preview →
            </button>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:B.t3,padding:"8px 0 4px"}}>Admin</div>
              {MOCK_ADMINS.map(u=>(
                <button key={u.id} onClick={()=>onLogin(u)} style={{width:"100%",padding:"12px 16px",border:`1px solid ${B.bdr}`,borderRadius:8,background:"#fff",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:12,transition:"all .15s",textAlign:"left"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=B.blueL;e.currentTarget.style.borderColor=B.blue}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor=B.bdr}}>
                  <div style={{width:36,height:36,borderRadius:18,background:B.navy,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{u.avatar}</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:B.t1}}>{u.name}</div><div style={{fontSize:11,color:B.t3}}>{u.email}</div></div>
                  <div style={{marginLeft:"auto",fontSize:10,fontWeight:600,color:B.blue,background:B.blueL,padding:"3px 8px",borderRadius:6}}>ADMIN</div>
                </button>
              ))}
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:B.t3,padding:"12px 0 4px"}}>Trainees</div>
              {MOCK_TRAINEES.map(u=>(
                <button key={u.id} onClick={()=>onLogin(u)} style={{width:"100%",padding:"12px 16px",border:`1px solid ${B.bdr}`,borderRadius:8,background:"#fff",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:12,transition:"all .15s",textAlign:"left"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=B.blueL;e.currentTarget.style.borderColor=B.blue}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor=B.bdr}}>
                  <div style={{width:36,height:36,borderRadius:18,background:B.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{u.avatar}</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:B.t1}}>{u.name}</div><div style={{fontSize:11,color:B.t3}}>{u.email}</div></div>
                </button>
              ))}
            </div>
          )}
        </div>
        <p style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,.3)",marginTop:24}}>© 2026 Aiola CPA, PLLC. All rights reserved.</p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

function AdminDashboard({ user, allData, onViewTrainee, onLogout }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [trainees, setTrainees] = useState(MOCK_TRAINEES);

  const handleAdd = () => {
    if(!newName.trim()||!newEmail.trim()) return;
    const id = newName.toLowerCase().replace(/\s/g,"_")+"_"+Date.now();
    const initials = newName.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
    setTrainees(p=>[...p,{id,name:newName,email:newEmail,role:"trainee",startDate:new Date().toISOString().slice(0,10),track:"Advisory",avatar:initials}]);
    setNewName(""); setNewEmail(""); setShowAdd(false);
  };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",background:B.bg,color:B.t1}}>
      <header style={{background:"#fff",borderBottom:`1px solid ${B.bdr}`,padding:"14px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <Logo size={32}/>
          <div><div style={{fontWeight:700,fontSize:15,color:B.navy}}>Advisory Training Portal</div><div style={{fontSize:11,color:B.t3}}>Admin Dashboard</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:600,color:B.t1}}>{user.name}</div><div style={{fontSize:11,color:B.t3}}>Administrator</div></div>
          <div style={{width:36,height:36,borderRadius:18,background:B.navy,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{user.avatar}</div>
          <button onClick={onLogout} style={{padding:"6px 14px",border:`1px solid ${B.bdr}`,borderRadius:6,background:"#fff",cursor:"pointer",fontSize:11,color:B.t3,fontFamily:"inherit"}}>Sign Out</button>
        </div>
      </header>
      <div style={{padding:"28px 32px",maxWidth:1100,margin:"0 auto"}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
          {[
            {label:"Active Trainees",val:trainees.length,color:B.blue,icon:"👥"},
            {label:"Avg. Completion",val:(()=>{const ps=trainees.map(t=>calcProg(allData[t.id]?.tasks,allData[t.id]?.quizzes).pct);return ps.length?Math.round(ps.reduce((a,b)=>a+b,0)/ps.length):0})()+"%",color:B.ok,icon:"📊"},
            {label:"Quizzes Passed",val:trainees.reduce((a,t)=>a+calcProg(allData[t.id]?.tasks,allData[t.id]?.quizzes).passedQuizzes,0),color:B.purple,icon:"✅"},
            {label:"Tasks Completed",val:trainees.reduce((a,t)=>a+calcProg(allData[t.id]?.tasks,allData[t.id]?.quizzes).doneTasks,0),color:B.warn,icon:"📋"},
          ].map((s,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:12,padding:20,border:`1px solid ${B.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3}}>{s.label}</span>
                <span style={{fontSize:18}}>{s.icon}</span>
              </div>
              <div style={{fontSize:28,fontWeight:700,color:s.color}}>{s.val}</div>
            </div>
          ))}
        </div>
        {/* Table */}
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${B.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)",overflow:"hidden"}}>
          <div style={{padding:"18px 24px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <h2 style={{margin:0,fontSize:16,fontWeight:700,color:B.navy}}>Team Members</h2>
            <button onClick={()=>setShowAdd(!showAdd)} style={{padding:"8px 18px",border:"none",borderRadius:8,background:B.blue,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Trainee</button>
          </div>
          {showAdd && (
            <div style={{padding:"16px 24px",borderBottom:`1px solid ${B.bdr}`,background:B.blueL,display:"flex",gap:12,alignItems:"flex-end"}}>
              <div style={{flex:1}}><label style={{fontSize:11,fontWeight:600,color:B.t2,display:"block",marginBottom:4}}>Full Name</label><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. Chris Martinez" style={{width:"100%",padding:"8px 12px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/></div>
              <div style={{flex:1}}><label style={{fontSize:11,fontWeight:600,color:B.t2,display:"block",marginBottom:4}}>Email</label><input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="e.g. chris@aiolacpa.com" style={{width:"100%",padding:"8px 12px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/></div>
              <button onClick={handleAdd} style={{padding:"9px 20px",border:"none",borderRadius:6,background:B.ok,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Add</button>
              <button onClick={()=>setShowAdd(false)} style={{padding:"9px 16px",border:`1px solid ${B.bdr}`,borderRadius:6,background:"#fff",color:B.t3,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 100px",padding:"12px 24px",borderBottom:`1px solid ${B.bdr}`,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:B.t3}}>
            <span>Name</span><span>Track</span><span>Start Date</span><span>Progress</span><span>Quizzes</span><span></span>
          </div>
          {trainees.map(t=>{
            const prog=calcProg(allData[t.id]?.tasks,allData[t.id]?.quizzes);
            const days=daysSince(t.startDate);
            const phase=days<=30?"Days 1–30":days<=60?"Days 31–60":"Days 61–90";
            const phaseColor=days<=30?B.blue:days<=60?B.purple:B.ok;
            return(
              <div key={t.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 100px",padding:"14px 24px",borderBottom:`1px solid ${B.bdr}`,alignItems:"center",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:18,background:B.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{t.avatar}</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:B.t1}}>{t.name}</div><div style={{fontSize:11,color:B.t3}}>{t.email}</div></div>
                </div>
                <span style={{fontSize:12,fontWeight:500,color:phaseColor}}>{phase}</span>
                <span style={{fontSize:12,color:B.t2}}>{new Date(t.startDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,height:6,borderRadius:3,background:B.blueL,overflow:"hidden",maxWidth:80}}><div style={{height:"100%",borderRadius:3,width:`${prog.pct}%`,background:prog.pct===100?B.ok:B.blue,transition:"width .4s"}}/></div>
                  <span style={{fontSize:12,fontWeight:600,color:prog.pct===100?B.ok:B.t1}}>{prog.pct}%</span>
                </div>
                <span style={{fontSize:12,color:B.t2}}>{prog.passedQuizzes}/{totalQuizzes}</span>
                <button onClick={()=>onViewTrainee(t)} style={{padding:"6px 14px",border:`1px solid ${B.blue}`,borderRadius:6,background:"#fff",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>View Portal</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TRAINEE PORTAL
// ═════════════════════════════════════════════════════════════════════════════

function TraineePortal({ user, completedTasks, quizResults, onToggleTask, onPassQuiz, onLogout, isAdminView, onBackToAdmin }) {
  const [aP, setAP] = useState("week1");
  const [aI, setAI] = useState("d1");
  const [qM, setQM] = useState(null);
  const [qS, setQS] = useState(null);
  const [qSub, setQSub] = useState(false);
  const [sO, setSO] = useState(true);
  const [eP, setEP] = useState({week1:true});
  const mR = useRef(null);
  const prog = calcProg(completedTasks, quizResults);
  const cPh = PHASES.find(p=>p.id===aP);
  const cIt = cPh?.items.find(i=>i.id===aI)||cPh?.items[0];

  const sel = (pid,iid) => { setAP(pid); setAI(iid); setEP(p=>({...p,[pid]:true})); setQM(null); setQS(null); setQSub(false); if(mR.current)mR.current.scrollTop=0; };
  const hQS = (itemId,correct) => { setQSub(true); if(qS===correct)onPassQuiz(itemId); };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",display:"flex",height:"100vh",width:"100%",background:B.bg,color:B.t1,overflow:"hidden"}}>
      <aside style={{width:sO?280:0,minWidth:sO?280:0,background:"#fff",borderRight:`1px solid ${B.bdr}`,display:"flex",flexDirection:"column",overflow:"hidden",transition:"width .3s,min-width .3s"}}>
        <div style={{padding:"18px 20px 14px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:10}}>
          <Logo size={30}/><div><div style={{fontWeight:700,fontSize:13,color:B.navy,letterSpacing:.5}}>AIOLA CPA, PLLC</div><div style={{fontSize:10,color:B.t3,marginTop:1}}>Training Portal</div></div>
        </div>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:16,background:B.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{user.avatar}</div>
          <div><div style={{fontSize:12,fontWeight:600,color:B.t1}}>{user.name}</div><div style={{fontSize:10,color:B.t3}}>{user.track||"Advisory"} Track</div></div>
        </div>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${B.bdr}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3}}>Overall</span>
            <span style={{fontSize:12,fontWeight:700,color:prog.pct===100?B.ok:B.blue}}>{prog.pct}%</span>
          </div>
          <div style={{height:5,borderRadius:3,background:B.blueL,overflow:"hidden"}}><div style={{height:"100%",width:`${prog.pct}%`,borderRadius:3,background:prog.pct===100?B.ok:`linear-gradient(90deg,${B.blue},${B.blueD})`,transition:"width .5s"}}/></div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:B.t3}}><span>{prog.doneTasks}/{totalTasks} tasks</span><span>{prog.passedQuizzes}/{totalQuizzes} quizzes</span></div>
        </div>
        <nav style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
          {pMeta.map(meta=>(
            <div key={meta.label}>
              <div style={{padding:"8px 20px 3px",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:meta.color,opacity:.7}}>{meta.label}</div>
              {PHASES.filter(p=>meta.ids.includes(p.id)).map(phase=>{
                const pp=phaseProg(phase,completedTasks); const isE=eP[phase.id];
                return(
                  <div key={phase.id}>
                    <button onClick={()=>{setEP(p=>({...p,[phase.id]:!p[phase.id]}));if(!isE)sel(phase.id,phase.items[0].id);}}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"6px 20px",border:"none",background:"none",cursor:"pointer",fontSize:12,fontWeight:600,color:aP===phase.id?B.blue:B.t1,fontFamily:"inherit",textAlign:"left"}}>
                      <Chev open={isE}/><span style={{flex:1}}>{phase.label}</span>
                      {pp===100?<span style={{width:16,height:16,borderRadius:8,background:B.ok,display:"flex",alignItems:"center",justifyContent:"center"}}><Chk/></span>:<span style={{fontSize:10,color:B.t3}}>{pp}%</span>}
                    </button>
                    {isE&&<div style={{paddingLeft:36}}>{phase.items.map(item=>{
                      const ip=itemProg(item,completedTasks); const isA=aI===item.id&&aP===phase.id;
                      return <button key={item.id} onClick={()=>sel(phase.id,item.id)}
                        style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"5px 12px 5px 6px",border:"none",cursor:"pointer",background:isA?B.blueL:"transparent",borderRadius:5,fontSize:11,fontWeight:isA?600:400,color:isA?B.blue:B.t2,fontFamily:"inherit",textAlign:"left",marginBottom:1,transition:"background .15s"}}>
                        <span style={{width:7,height:7,borderRadius:4,flexShrink:0,background:ip===100?B.ok:ip>0?B.blue:B.bdr}}/><span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title.split(" — ")[0]}</span>
                      </button>;
                    })}</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <main ref={mR} style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 28px",background:"#fff",borderBottom:`1px solid ${B.bdr}`,position:"sticky",top:0,zIndex:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button onClick={()=>setSO(!sO)} style={{border:"none",background:"none",cursor:"pointer",padding:4,display:"flex"}}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><line x1="3" y1="5" x2="17" y2="5" stroke={B.t2} strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="17" y2="10" stroke={B.t2} strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="15" x2="17" y2="15" stroke={B.t2} strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <div><h1 style={{margin:0,fontSize:16,fontWeight:700,color:B.navy}}>{cIt?.title||"Training"}</h1><p style={{margin:0,fontSize:11,color:B.t3,marginTop:1}}>{cPh?.subtitle} · {cPh?.phase}</p></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            {isAdminView&&<button onClick={onBackToAdmin} style={{padding:"6px 14px",border:`1px solid ${B.blue}`,borderRadius:6,background:"#fff",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← Back to Admin</button>}
            <div style={{display:"flex",alignItems:"center",gap:6}}><Ring pct={prog.pct} size={32} stroke={3}/><div style={{fontSize:13,fontWeight:700,color:prog.pct===100?B.ok:B.navy}}>{prog.pct}%</div></div>
            {!isAdminView&&<button onClick={onLogout} style={{padding:"6px 12px",border:`1px solid ${B.bdr}`,borderRadius:6,background:"#fff",cursor:"pointer",fontSize:11,color:B.t3,fontFamily:"inherit"}}>Sign Out</button>}
          </div>
        </header>
        {cIt&&(
          <div style={{padding:"24px 28px",maxWidth:800,width:"100%"}}>
            <p style={{fontSize:13,color:B.t2,lineHeight:1.6,marginTop:0,marginBottom:20}}>{cIt.description}</p>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <div style={{flex:1,height:7,borderRadius:4,background:B.blueL,overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,transition:"width .4s",width:`${itemProg(cIt,completedTasks)}%`,background:itemProg(cIt,completedTasks)===100?B.ok:`linear-gradient(90deg,${B.blue},${B.blueD})`}}/></div>
              <span style={{fontSize:12,fontWeight:600,color:itemProg(cIt,completedTasks)===100?B.ok:B.blue,whiteSpace:"nowrap"}}>{cIt.tasks.filter(t=>completedTasks[t.id]).length} / {cIt.tasks.length}</span>
            </div>
            {/* Tasks Card */}
            <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`}}><span style={{fontSize:12,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Tasks</span></div>
              {cIt.tasks.map((task,idx)=>{
                const done=!!completedTasks[task.id];
                return(
                  <div key={task.id} onClick={()=>onToggleTask(task.id)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 18px",borderBottom:idx<cIt.tasks.length-1?`1px solid ${B.bdr}`:"none",cursor:"pointer",transition:"background .15s",background:done?B.okBg:"transparent"}}
                    onMouseEnter={e=>{if(!done)e.currentTarget.style.background="#fafbfc"}} onMouseLeave={e=>{e.currentTarget.style.background=done?B.okBg:"transparent"}}>
                    <div style={{width:20,height:20,borderRadius:5,flexShrink:0,marginTop:1,border:done?"none":`2px solid ${B.bdr}`,background:done?B.ok:"#fff",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{done&&<Chk/>}</div>
                    <span style={{fontSize:13,lineHeight:1.5,color:done?B.t3:B.t1,textDecoration:done?"line-through":"none",transition:"color .2s"}}>{task.text}</span>
                  </div>
                );
              })}
            </div>
            {/* Resources */}
            {cIt.resources?.length>0&&(
              <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
                <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:6}}><BookIc/><span style={{fontSize:12,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Resources</span></div>
                <div style={{padding:"10px 18px",display:"flex",flexWrap:"wrap",gap:6}}>
                  {cIt.resources.map((r,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:18,fontSize:11,fontWeight:500,background:B.blueL,color:B.blue,border:`1px solid ${B.blueM}`,cursor:"pointer"}}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 1.5h4.59L10.5 4.91V10.5h-8v-9z" stroke={B.blue} strokeWidth="1.2"/><path d="M7 1.5V5h3.5" stroke={B.blue} strokeWidth="1.2"/></svg>{r.label}
                  </span>)}
                </div>
              </div>
            )}
            {/* Quiz */}
            {cIt.quiz&&(
              <div style={{background:B.card,border:`1px solid ${quizResults[cIt.id]?B.ok:B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
                <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:quizResults[cIt.id]?B.okBg:"transparent"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>{quizResults[cIt.id]?<Trophy/>:<QuizIc/>}<span style={{fontSize:12,fontWeight:700,color:quizResults[cIt.id]?B.ok:B.navy,textTransform:"uppercase",letterSpacing:.8}}>{quizResults[cIt.id]?"Quiz Passed":"Knowledge Check"}</span></div>
                  {quizResults[cIt.id]&&<span style={{fontSize:10,fontWeight:600,color:B.ok,background:B.okL,padding:"2px 8px",borderRadius:10}}>✓ Complete</span>}
                </div>
                {quizResults[cIt.id]?<div style={{padding:"16px 18px",color:B.t2,fontSize:12}}>You've already passed this quiz.</div>
                :qM===cIt.id?(
                  <div style={{padding:18}}>
                    <p style={{fontSize:13,fontWeight:600,color:B.navy,lineHeight:1.5,marginTop:0,marginBottom:14}}>{cIt.quiz.question}</p>
                    {cIt.quiz.options.map((opt,idx)=>{
                      const isSel=qS===idx,isCor=idx===cIt.quiz.correct;
                      let bg="#fff",bd=B.bdr,cl=B.t1;
                      if(qSub){if(isCor){bg=B.okBg;bd=B.ok;cl=B.ok}else if(isSel&&!isCor){bg="#fef2f2";bd=B.err;cl=B.err}}
                      else if(isSel){bg=B.blueL;bd=B.blue;cl=B.blue}
                      return <div key={idx} onClick={()=>{if(!qSub)setQS(idx)}} style={{padding:"10px 14px",border:`2px solid ${bd}`,borderRadius:7,marginBottom:6,cursor:qSub?"default":"pointer",background:bg,color:cl,fontSize:12,fontWeight:isSel?600:400,transition:"all .2s",display:"flex",alignItems:"center",gap:10}}>
                        <span style={{width:20,height:20,borderRadius:10,flexShrink:0,border:`2px solid ${isSel?bd:B.bdr}`,background:isSel?(qSub?(isCor?B.ok:B.err):B.blue):"#fff",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{isSel&&<div style={{width:6,height:6,borderRadius:3,background:"#fff"}}/>}</span>{opt}
                      </div>;
                    })}
                    <div style={{display:"flex",gap:6,marginTop:14}}>
                      {!qSub?<button disabled={qS===null} onClick={()=>hQS(cIt.id,cIt.quiz.correct)} style={{padding:"8px 20px",border:"none",borderRadius:7,background:qS!==null?B.blue:B.bdr,color:"#fff",fontSize:12,fontWeight:600,cursor:qS!==null?"pointer":"default",fontFamily:"inherit"}}>Submit</button>
                      :<>{qS!==cIt.quiz.correct&&<button onClick={()=>{setQS(null);setQSub(false)}} style={{padding:"8px 20px",border:`1px solid ${B.blue}`,borderRadius:7,background:"#fff",color:B.blue,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Try Again</button>}
                        <button onClick={()=>{setQM(null);setQS(null);setQSub(false)}} style={{padding:"8px 16px",border:`1px solid ${B.bdr}`,borderRadius:7,background:"#fff",color:B.t3,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Close</button></>}
                    </div>
                  </div>
                ):(
                  <div style={{padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <p style={{margin:0,fontSize:12,color:B.t2}}>Test your knowledge before moving on.</p>
                    <button onClick={()=>setQM(cIt.id)} style={{padding:"7px 16px",border:"none",borderRadius:7,background:B.blue,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Start Quiz</button>
                  </div>
                )}
              </div>
            )}
            {/* Nav */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:6,paddingBottom:32}}>
              {(()=>{
                const all=PHASES.flatMap(p=>p.items.map(i=>({...i,phaseId:p.id})));
                const ci=all.findIndex(i=>i.id===cIt.id);
                const prev=ci>0?all[ci-1]:null,next=ci<all.length-1?all[ci+1]:null;
                return<>{prev?<button onClick={()=>sel(prev.phaseId,prev.id)} style={{padding:"8px 16px",border:`1px solid ${B.bdr}`,borderRadius:7,background:"#fff",color:B.t2,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>← Previous</button>:<div/>}
                  {next?<button onClick={()=>sel(next.phaseId,next.id)} style={{padding:"8px 16px",border:"none",borderRadius:7,background:B.blue,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Next →</button>
                  :<div style={{padding:"8px 16px",borderRadius:7,background:B.okBg,color:B.ok,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}><Trophy/> Final Section</div>}</>;
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// APP SHELL
// ═════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("login");
  const [viewingTrainee, setViewingTrainee] = useState(null);
  const [allUserData, setAllUserData] = useState({...SEED_DATA});

  useEffect(()=>{ (async()=>{ try{ const d=await window.storage.get("aiola-portal-v2"); if(d){ const p=JSON.parse(d.value); setAllUserData(prev=>{const m={...prev};for(const uid in p){m[uid]={tasks:{...(prev[uid]?.tasks||{}),...(p[uid]?.tasks||{})},quizzes:{...(prev[uid]?.quizzes||{}),...(p[uid]?.quizzes||{})}}}return m}); }}catch{}})(); },[]);
  useEffect(()=>{ (async()=>{ try{await window.storage.set("aiola-portal-v2",JSON.stringify(allUserData))}catch{}})(); },[allUserData]);

  const handleLogin = u => { setCurrentUser(u); setView(u.role==="admin"?"admin":"trainee"); };
  const handleLogout = () => { setCurrentUser(null); setView("login"); setViewingTrainee(null); };
  const toggleTask = uid => tid => setAllUserData(p=>({...p,[uid]:{tasks:{...(p[uid]?.tasks||{}),[tid]:!(p[uid]?.tasks?.[tid])},quizzes:p[uid]?.quizzes||{}}}));
  const passQuiz = uid => iid => setAllUserData(p=>({...p,[uid]:{tasks:p[uid]?.tasks||{},quizzes:{...(p[uid]?.quizzes||{}),[iid]:true}}}));
  const viewTrainee = t => { setViewingTrainee(t); setView("trainee-admin"); };

  if(view==="login") return <LoginScreen onLogin={handleLogin}/>;
  if(view==="admin") return <AdminDashboard user={currentUser} allData={allUserData} onViewTrainee={viewTrainee} onLogout={handleLogout}/>;
  if(view==="trainee-admin"&&viewingTrainee){ const uid=viewingTrainee.id; return <TraineePortal user={viewingTrainee} completedTasks={allUserData[uid]?.tasks||{}} quizResults={allUserData[uid]?.quizzes||{}} onToggleTask={toggleTask(uid)} onPassQuiz={passQuiz(uid)} onLogout={handleLogout} isAdminView={true} onBackToAdmin={()=>setView("admin")}/>; }
  if(view==="trainee"&&currentUser){ const uid=currentUser.id; return <TraineePortal user={currentUser} completedTasks={allUserData[uid]?.tasks||{}} quizResults={allUserData[uid]?.quizzes||{}} onToggleTask={toggleTask(uid)} onPassQuiz={passQuiz(uid)} onLogout={handleLogout} isAdminView={false} onBackToAdmin={null}/>; }
  return null;
}
