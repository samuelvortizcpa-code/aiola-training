import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import jsPDF from "jspdf";
import { applyPlugin } from "jspdf-autotable";
applyPlugin(jsPDF);

// ─── Responsive CSS ─────────────────────────────────────────────────────────
const RESPONSIVE_CSS = `
/* Mobile-first responsive overrides */
@media (max-width: 768px) {
  /* Headers */
  .r-header { padding: 10px 16px !important; gap: 8px !important; flex-wrap: wrap; }
  .r-header-title { font-size: 13px !important; }
  .r-header-sub { font-size: 10px !important; }
  .r-header-right { gap: 8px !important; }
  .r-header-right .r-hide-mobile { display: none !important; }

  /* Content areas */
  .r-content { padding: 16px !important; }

  /* Stat card grids — 2 columns on mobile */
  .r-stat-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }

  /* Data tables — horizontal scroll */
  .r-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .r-table-grid { min-width: 700px; }

  /* Client portal 3-col → 1-col */
  .r-three-col { grid-template-columns: 1fr !important; }

  /* Client portal team cards — 1 col on mobile */
  .r-team-grid { grid-template-columns: 1fr !important; }

  /* Trainee sidebar — overlay on mobile */
  .r-trainee-sidebar {
    position: fixed !important;
    z-index: 50 !important;
    height: 100vh !important;
    box-shadow: 4px 0 20px rgba(0,0,0,.15);
  }
  .r-sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.3);
    z-index: 49;
  }

  /* Trainee main content */
  .r-trainee-main-header { padding: 10px 16px !important; }
  .r-trainee-content { padding: 16px !important; }

  /* Touch targets */
  .r-touch { min-height: 44px; min-width: 44px; }

  /* Filter buttons — wrap */
  .r-filter-row { flex-wrap: wrap; gap: 8px !important; }

  /* Add trainee form — stack vertically */
  .r-add-form { flex-direction: column !important; align-items: stretch !important; }

  /* Tab rows — scroll horizontally */
  .r-tab-row { overflow-x: auto; -webkit-overflow-scrolling: touch; }

  /* Font size floors */
  .r-body-text { font-size: 14px !important; }
}

@media (max-width: 480px) {
  .r-stat-grid { grid-template-columns: 1fr !important; }
  .r-header { padding: 8px 12px !important; }
  .r-content { padding: 12px !important; }
  .r-chat-panel { width: calc(100vw - 16px) !important; height: calc(100vh - 80px) !important; bottom: 8px !important; right: 8px !important; }
  .r-chat-sidebar { display: none !important; }
  .r-chat-body { border-left: none !important; }
  .r-chat-history-toggle { display: inline-flex !important; }
}

@media (min-width: 769px) {
  .r-sidebar-overlay { display: none; }
}
`;

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
        quiz: { questions: [
          { id: "d1q1", type: "multiple_choice", question: "What is the first thing you should do after receiving your laptop?", options: ["Start reviewing client files", "Change all default passwords and enable MFA", "Set up your email signature", "Join Slack channels"], correct: 1 },
          { id: "d1q2", type: "multiple_choice", question: "Which of the following is NOT part of Day 1 setup?", options: ["Configure multi-factor authentication", "Join required Slack/Teams channels", "Complete a practice tax return", "Review the Employee Handbook"], correct: 2 },
          { id: "d1q3", type: "free_text", question: "In your own words, why is multi-factor authentication important for a CPA firm?", modelAnswer: "MFA adds an extra layer of security beyond passwords, which is critical for CPA firms because we handle sensitive client financial data. A compromised account could expose SSNs, tax returns, and bank information." },
        ]},
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
        videos: [{ label: "ClickUp Workspace Setup Walkthrough", embedId: "dQw4w9WgXcQ" }],
        quiz: { questions: [
          { id: "d2q1", type: "multiple_choice", question: "In Aiola's ClickUp workflow, what status should a task be moved to when you've completed your work but it needs a manager review?", options: ["Done", "In Review", "Closed", "Pending Client"], correct: 1 },
          { id: "d2q2", type: "multiple_choice", question: "What is the correct Aiola naming convention for client tasks?", options: ["[Client Last] - Task Description", "[Client First Last] - [Category] - Task Description", "Task Description - Client Name", "No specific convention is required"], correct: 1 },
          { id: "d2q3", type: "free_text", question: "Describe a situation where you would use a ClickUp subtask vs. a separate task. Give an example relevant to a CPA firm.", modelAnswer: "Subtasks work best for breaking down a larger deliverable — for example, a 'Prepare Q1 Tax Filing for Smith LLC' task might have subtasks like 'Gather K-1 documents', 'Review prior year return', and 'Draft return for manager review'. Separate tasks are better for independent work items that need their own tracking." },
        ]},
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
        videos: [{ label: "Front Inbox Management Demo", embedId: "dQw4w9WgXcQ" }],
        quiz: { questions: [
          { id: "d3q1", type: "multiple_choice", question: "When should you escalate a client email to a senior advisor?", options: ["Whenever you're unsure about anything", "Only when the client explicitly asks for a manager", "When the issue involves tax strategy decisions, compliance risk, or client dissatisfaction", "Never — handle everything independently"], correct: 2 },
          { id: "d3q2", type: "free_text", question: "Draft a brief, professional email response to a client who asks: 'Can I deduct my home office if I'm a W-2 employee?' Keep your tone friendly but accurate.", modelAnswer: "Hi [Client Name], great question! Unfortunately, the home office deduction is generally not available for W-2 employees under current tax law (since the 2017 Tax Cuts and Jobs Act). However, if you also have self-employment income, you may qualify. I'd love to review your full situation — want me to schedule a quick call? Best, [Your Name]" },
        ]},
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
        videos: [{ label: "Meet the Aiola CPA Team", embedId: "dQw4w9WgXcQ" }, { label: "Advisory Engagement Overview", embedId: "dQw4w9WgXcQ" }],
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
        videos: [{ label: "Sample ISM Recording — How a Great Meeting Looks", embedId: "dQw4w9WgXcQ" }],
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
  { id: "chris_m", name: "Chris Martinez", email: "chris@aiolacpa.com", role: "trainee", startDate: "2026-04-21", track: "Advisory", avatar: "CM" },
  { id: "mary_c", name: "Mary Chen", email: "mary@aiolacpa.com", role: "trainee", startDate: "2026-02-23", track: "Advisory", avatar: "MC" },
];
const MOCK_ADMINS = [
  { id: "nick_a", name: "Nick Aiola", email: "nick@aiolacpa.com", role: "admin", avatar: "NA" },
];
const MOCK_CLIENTS = [
  { id: "alex_r", name: "Alex Rivera", email: "alex.rivera@email.com", role: "client", avatar: "AR" },
];

const SEED_DATA = {
  chris_m: { tasks: { d1t1:true,d1t2:true,d1t3:true,d1t4:true,d1t5:true,d1t6:true,d2t1:true,d2t2:true,d2t3:true,d3t1:true,d3t2:true }, quizzes: { d1:true, d2:true } },
  mary_c: { tasks: { d1t1:true,d1t2:true,d1t3:true,d1t4:true,d1t5:true,d1t6:true,d2t1:true,d2t2:true,d2t3:true,d2t4:true,d2t5:true,d3t1:true,d3t2:true,d3t3:true,d3t4:true,d3t5:true,d4t1:true,d4t2:true,d4t3:true,d4t4:true,d4t5:true,d5t1:true,d5t2:true,d5t3:true,d5t4:true,d5t5:true,w2t1:true,w2t2:true,w2t3:true,w2t4:true,w2t5:true,w2t6:true,w3t1:true,w3t2:true,w3t3:true,w3t4:true,w3t5:true,w3t6:true }, quizzes: { d1:true,d2:true,d3:true,d4:true,d5:true,w2:true,w3:true } },
  sarah_k: { tasks: { d1t1:true,d1t2:true,d1t3:true }, quizzes: { d1:true } },
};

// ─── KPI Data ─────────────────────────────────────────────────────────────────

const ONBOARDING_KPIS = [
  {
    id: "communication",
    category: "Communication & Responsiveness",
    description: "Weekly manager score (1-5) for response time, effectiveness of communication, clarity/completeness of messages, and frequency/quality of questions asked.",
    targets: { day30: 4.0, day60: 4.2, day90: 4.5 },
    frequency: "Weekly",
    source: "Manager submission",
  },
  {
    id: "teamwork",
    category: "Teamwork & Culture Fit",
    description: "Team pulse score (1-5) on teamwork, collaboration, professionalism, approachability, initiative, energy. Sent on Day 25, 55, 85.",
    targets: { day30: 4.0, day60: 4.2, day90: 4.5 },
    frequency: "Day 25, 55, 85",
    source: "Team pulse survey",
  },
];

const KPI_SEED_DATA = {
  chris_m: {
    communication: [
      { week: 1, score: 3.8, manager: "Nick Aiola", date: "2026-04-28", comment: "Good start, responsive on Slack" },
      { week: 2, score: 4.0, manager: "Nick Aiola", date: "2026-05-05", comment: "Improving clarity in emails" },
      { week: 3, score: 4.2, manager: "Nick Aiola", date: "2026-05-12", comment: "Proactive follow-ups" },
    ],
    teamwork: [
      { week: 4, score: 4.1, manager: "Team Survey", date: "2026-05-16", comment: "Day 25 pulse — strong collaborator" },
    ],
  },
  mary_c: {
    communication: [
      { week: 1, score: 3.5, manager: "Nick Aiola", date: "2026-03-02", comment: "Needs to ask more questions" },
      { week: 2, score: 3.7, manager: "Nick Aiola", date: "2026-03-09", comment: "Better follow-through" },
      { week: 3, score: 3.9, manager: "Nick Aiola", date: "2026-03-16", comment: "Communication improving" },
      { week: 4, score: 4.0, manager: "Nick Aiola", date: "2026-03-23", comment: "Hitting stride" },
      { week: 5, score: 4.1, manager: "Nick Aiola", date: "2026-03-30", comment: "Excellent week" },
    ],
    teamwork: [
      { week: 4, score: 3.8, manager: "Team Survey", date: "2026-03-22", comment: "Day 25 pulse" },
      { week: 8, score: 4.0, manager: "Team Survey", date: "2026-04-21", comment: "Day 55 pulse — good improvement" },
    ],
  },
};

// ─── Notes & Badges Data ──────────────────────────────────────────────────────

const BADGE_PRESETS = [
  { id: "communicator", label: "Great Communicator", icon: "💬" },
  { id: "learner", label: "Quick Learner", icon: "⚡" },
  { id: "teamplayer", label: "Team Player", icon: "🤝" },
  { id: "detail", label: "Detail Oriented", icon: "🔍" },
  { id: "starter", label: "Self-Starter", icon: "🚀" },
];

const NOTES_SEED_DATA = {
  chris_m: {
    notes: [
      { id: "n1", date: "2026-04-28", author: "Nick Aiola", text: "Needs to improve response time on Slack — discussed in 1-on-1", visibility: "admin" },
      { id: "n2", date: "2026-05-02", author: "Nick Aiola", text: "Great job completing Week 1 tasks ahead of schedule!", visibility: "shared" },
    ],
    badges: [
      { id: "b1", badgeId: "learner", label: "Quick Learner", icon: "⚡", date: "2026-05-02", awardedBy: "Nick Aiola" },
    ],
  },
  mary_c: {
    notes: [
      { id: "n3", date: "2026-03-10", author: "Nick Aiola", text: "Excellent questions during onboarding — shows deep curiosity", visibility: "shared" },
      { id: "n4", date: "2026-03-18", author: "Nick Aiola", text: "Needs to work on time management — missed two task deadlines this week", visibility: "admin" },
    ],
    badges: [
      { id: "b2", badgeId: "communicator", label: "Great Communicator", icon: "💬", date: "2026-03-15", awardedBy: "Nick Aiola" },
      { id: "b3", badgeId: "detail", label: "Detail Oriented", icon: "🔍", date: "2026-03-25", awardedBy: "Nick Aiola" },
    ],
  },
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

// ─── Training Assistant ──────────────────────────────────────────────────────

const TRAINING_ASSISTANT_SYSTEM_PROMPT = `You are the Aiola CPA Training Assistant — an internal resource for new employees during their 90-day onboarding. Your job is to help new hires understand Aiola's culture, values, policies, and expectations.

RULES:
- Answer questions using ONLY the internal documents provided below.
- If the answer is not in these documents, say: "That's a great question — I don't have that specific detail here. I'd recommend asking your manager or Nick directly."
- Never speculate about tax advice, client information, or anything not covered below.
- Keep answers clear, encouraging, and aligned with Aiola's tone: direct, professional, and supportive.
- When relevant, reference the specific value or section the answer comes from.

---

AIOLA CPA — INTERNAL KNOWLEDGE BASE

WHO WE ARE
Aiola CPA, PLLC was founded by Nick Aiola in 2012 as a tax prep firm in NYC. Over the years the focus narrowed to providing tax advisory, tax preparation, and accounting services solely to real estate investors and businesses in the real estate industry. Aiola CPA is now 100% virtual and serves clients remotely nationwide.

We are a fully remote team of professionals passionate about saving real estate investors tax dollars and providing the best client experience. We turn complicated tax strategies into clear, fast action steps that help investors build generational wealth. We are data- and results-driven. We communicate openly, speak plainly, hit deadlines, own our work from start to finish, and constantly ask "how can this be even better?"

MISSION
Save real estate investors money on taxes, and advise and communicate in a clear and descriptive manner.

VISION
Design the premier tax solution for real estate investors — the partner investors call first when evaluating the next investment, looking to reduce their tax bill, or planning for their financial future. We deliver clarity, speed, actionable steps, and measurable results. Achieving that future means operating with urgency, continuous learning, embracing automation, and a relentless focus on accuracy and client impact — every single day.

---

CORE VALUES

INTEGRITY — Choose the ethical path, even when it's uncomfortable.
We DO: Treat peers and clients with respect. Own mistakes immediately and fix them in the open. Provide guidance and advice we can stand behind, prove, and defend.
We DON'T: Hide errors, blame software, or blame the client. Cave to clients who pressure us to do something unethical or illegal. Respond to clients with an answer we are not sure of.

QUALITY — Deliver work that stands up to client expectations and peer review the first time.
We DO: Follow systems, processes, and instructions — no skipped steps. Review our work at every step. Use primary sources (tax law, court cases), not second-hand summaries, for tax positions.
We DON'T: Have a "good enough" mindset. Skip steps due to time or deadline pressure. Expect others to catch or correct our mistakes. Rely solely on AI/Google without cross-checking primary sources.

COMMUNICATION — Communicate clearly and concisely. Ask questions if unsure. Guide teammates who need help.
We DO: Provide details and context in all correspondence. Ask questions — it is always better to ask than guess. When asking a question, propose solutions or suggested actions. Approach communication with clients as an educator. Translate complex topics into bite-sized, easy to understand messages. Participate in social and group events.
We DON'T: Fail to provide context when explaining a situation. Guess or assume without asking questions. Send unclear messages — clarity is kindness. Forget our audience or use overly technical terms. Disrespect or speak negatively about teammates or clients.

EDUCATION (SELF-GROWTH) — Continuous self-development. Better individuals create a better team, which builds a better firm.
We DO: Block dedicated time for trainings, research, and personal study. Shadow teammates and ask "why" until the workflow clicks. Actively request and provide feedback — then apply it. Share new insights and ideas so the whole team levels up together.
We DON'T: Wait for someone else to spoon-feed knowledge. Suppress thoughts or ideas that may be beneficial. Avoid feedback loops because they feel uncomfortable. Miss trainings or opportunities to learn something new.

---

COMMUNICATION & RESPONSIVENESS STANDARDS
Standard: Respond with urgency — a virtual environment requires frequent, proactive, and transparent communication.
We DO: Acknowledge internal communications urgently (within 2 hours). Respond to clients within 48 business hours. Respond quickly even if we don't have all the answers (e.g., "Thank you for your email, I am looking into it and will get back to you ASAP."). Huddle or call for more complex topics to streamline conversations.
We DON'T: Ghost the team for half a day. Keep clients waiting. Shift blame to other team members if there are communication bottlenecks. Send lengthy messages that could be condensed or discussed via a call.

OWNERSHIP & URGENCY STANDARDS
Standard: Every task has an owner and a deadline. Done means completed, reviewed, and communicated.
We DO: Meticulously track and update our task management software. Respect deadlines — internal and external. Communicate roadblocks the moment they appear — no surprises at or after the deadline. Own tasks and emails that are assigned or introduced. Effectively manage time and workload.
We DON'T: Assume someone else is tracking open items. Forget to update the client as the project moves through the process. Fail to create and communicate a plan to catch up if falling behind. Avoid accountability or ignore KPIs.

COLLABORATION & POSITIVE ATTITUDE STANDARDS
Standard: We win as a team — share context, ask for help early, and give feedback that makes us all better.
We DO: Manage and be mindful of downstream processes and upcoming tasks in the pipeline. Offer to help when a teammate is stuck — help means teach and coach, not do it for them. Request and provide feedback, even for things that feel insignificant. Handle conflict directly and respectfully. Celebrate wins and share positive feedback with the team.
We DON'T: Avoid interaction with teammates. Hand off unfinished work with no notes or context. Act selfishly. Gossip, speak passive-aggressively, or stew silently — zero-tolerance policy. Omit honest feedback even if difficult.

GROWTH MINDSET & CONTINUOUS IMPROVEMENT STANDARDS
Standard: Treat every project, tool, and piece of feedback as an opportunity to learn, adapt, and raise the bar.
We DO: Ask how we can make ourselves, our team, and the firm better. Brainstorm how to contribute to firm growth — firm growth equals your growth. Actively request peer and manager feedback throughout the year. Test new software, apps, and systems to improve efficiency. Treat mistakes as data: analyze root causes, adjust, and move on.
We DON'T: Operate with a "me first" attitude. Push back on changes without constructive criticism. Dismiss suggestions without consideration or testing.

---

EMPLOYMENT BASICS

Classifications:
- Regular Full-Time: scheduled 40+ hours/week, generally eligible for all benefits
- Regular Part-Time: scheduled less than 40 hours/week, eligible for some benefits
- Temporary: specific project need, no benefits unless authorized in writing
- Exempt: meets FLSA tests, not subject to overtime pay requirements
- Non-Exempt: paid overtime (1.5x) for hours over 40/week

Pay Periods: Semi-monthly. Paydays are the 15th and last day of each month. If a payday falls on a weekend or holiday, employees are paid on the preceding scheduled workday.

Timekeeping: All non-exempt employees must use the timekeeping system. Clock in no sooner than 5 minutes before your shift, clock out no later than 5 minutes after. Clock in and out for designated lunch periods. Never ask another employee to clock in or out for you.

Overtime: Must be authorized by a supervisor or manager in advance. Non-exempt employees earn 1.5x pay for hours over 40 in a workweek.

---

PAID TIME OFF & HOLIDAYS

Holidays (paid): New Year's Day, Day after Original Individual Tax Filing Deadline, Memorial Day, Juneteenth, Independence Day, Labor Day, Day after Extended Individual Tax Filing Deadline, Veterans Day, Thanksgiving, Friday after Thanksgiving, Christmas Eve, Christmas Day, New Year's Eve.

PTO Policy: Aiola CPA does not have a set number of sick, personal, or vacation days. PTO requests must be approved by a manager. Employees are expected to balance work and time off appropriately.

Blackout Periods — PTO requests of 3+ consecutive days require 2 weeks' advance notice and may not be approved during:
- January 1 through April 15 (tax season)
- August 15 through October 15 (extension season)

Full-time employees may request PTO after completing their introductory period.

---

HOURS OF WORK & ATTENDANCE

Hours: As a professional service provider, Aiola CPA is available to clients between 9am and 5pm nationwide. The firm offers flexible working hours but employees are generally expected to be available during these hours.

Attendance: If unable to be at work on time or at all, notify your manager no later than 60 minutes before the start of your scheduled workday. Excessive tardiness or absences are unacceptable. If absent for 3 consecutive days without proper notification, the company will assume voluntary resignation.

Telecommuting: Employees may work from home occasionally or regularly depending on arrangements made with their manager. WFH is a privilege that may be revoked. To be eligible, employees must have reliable internet and a distraction-free workspace.

Telecommuting expectations:
- Work your full, typical schedule
- Attend all meetings virtually
- Maintain equivalent availability for colleagues and clients
- Respond promptly to messages, email, and phone
- Be available online and by phone for the full workday (minus breaks)
- Communicate consistently about your status and workload
- Follow all company policies as if you were in the office

Confidentiality: Employees may not disclose any confidential information or trade secrets to anyone outside the company without appropriate authorization. Confidential information includes internal reports, financials, client lists, and internal business communications. Conversation of a confidential nature should not be held within earshot of the public or clients.`;

const SUGGESTED_QUESTIONS = [
  "What are Aiola's core values?",
  "What's the PTO policy?",
  "When are the blackout periods?",
  "What are the communication standards?",
];

// Chat storage helpers
const CHAT_STORAGE_KEY = (name) => `aiola_chats_${name}`;
function loadChats(traineeName) {
  try { const s = localStorage.getItem(CHAT_STORAGE_KEY(traineeName)); return s ? JSON.parse(s) : []; } catch { return []; }
}
function saveChats(traineeName, chats) {
  localStorage.setItem(CHAT_STORAGE_KEY(traineeName), JSON.stringify(chats));
}
function newChat() {
  return { id: "c_" + Date.now(), title: "New conversation", date: new Date().toISOString(), messages: [] };
}

function TrainingAssistant({ traineeName, currentPhase, currentSection, progressPct, completedTaskCount, totalTaskCount, passedQuizCount, totalQuizCount }) {
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState(() => {
    const saved = loadChats(traineeName);
    // Migrate old single-conversation format
    if (saved.length === 0) {
      try {
        const old = localStorage.getItem(`aiola-training-assistant-${traineeName}`);
        if (old) {
          const oldMsgs = JSON.parse(old);
          if (oldMsgs.length > 0) {
            const migrated = { id: "c_migrated", title: (oldMsgs.find(m=>m.role==="user")?.content||"Conversation").slice(0,40), date: new Date(oldMsgs[0]?.ts||Date.now()).toISOString(), messages: oldMsgs };
            saveChats(traineeName, [migrated]);
            localStorage.removeItem(`aiola-training-assistant-${traineeName}`);
            return [migrated];
          }
        }
      } catch { /* ignore */ }
      return [];
    }
    return saved;
  });
  const [activeId, setActiveId] = useState(() => {
    const saved = loadChats(traineeName);
    return saved.length > 0 ? saved[0].id : null;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [retryMsg, setRetryMsg] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const activeChat = chats.find(c => c.id === activeId) || null;
  const msgs = activeChat?.messages || [];

  // Persist chats to localStorage
  useEffect(() => { saveChats(traineeName, chats); }, [chats, traineeName]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs.length, loading]);

  // Focus input on open
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open, activeId]);

  const updateActiveChat = (updater) => {
    setChats(prev => prev.map(c => c.id === activeId ? updater(c) : c));
  };

  const startNewChat = () => {
    const c = newChat();
    setChats(prev => [c, ...prev]);
    setActiveId(c.id);
    setRetryMsg(null);
    setShowHistory(false);
  };

  const switchChat = (id) => {
    setActiveId(id);
    setRetryMsg(null);
    setShowHistory(false);
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading || cooldown) return;
    setRetryMsg(null);

    const contextPrefix = `[Context: The trainee is ${traineeName}, currently on ${currentSection} of their training. They are in ${currentPhase}. Their overall progress is ${progressPct}%. They have completed ${completedTaskCount}/${totalTaskCount} tasks and passed ${passedQuizCount}/${totalQuizCount} quizzes.]\n\n`;

    const userMsg = { role: "user", content: text, ts: Date.now() };

    // If no active chat, create one
    let chatId = activeId;
    if (!chatId) {
      const c = newChat();
      c.title = text.slice(0, 40);
      c.messages = [userMsg];
      setChats(prev => [c, ...prev]);
      setActiveId(c.id);
      chatId = c.id;
    } else {
      setChats(prev => prev.map(c => {
        if (c.id !== chatId) return c;
        const updated = { ...c, messages: [...c.messages, userMsg] };
        if (c.messages.length === 0) updated.title = text.slice(0, 40);
        return updated;
      }));
    }

    setInput("");
    setLoading(true);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);

    // Build API history (last 20 messages, with context on latest user msg)
    const currentMsgs = [...(chats.find(c=>c.id===chatId)?.messages||[]), userMsg];
    const apiHistory = currentMsgs.slice(-20).map((m, i, arr) => {
      if (i === arr.length - 1 && m.role === "user") {
        return { role: "user", content: contextPrefix + m.content };
      }
      return { role: m.role, content: m.content };
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: TRAINING_ASSISTANT_SYSTEM_PROMPT,
          messages: apiHistory,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "API error");
      const reply = data.content.map(c => c.text || "").join("\n");
      const assistantMsg = { role: "assistant", content: reply, ts: Date.now() };
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, assistantMsg] } : c));
    } catch {
      setRetryMsg(text);
      const errMsg = { role: "assistant", content: "I'm having trouble connecting right now. Try again in a moment, or reach out to your manager on Slack.", ts: Date.now(), error: true };
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, errMsg] } : c));
    } finally {
      setLoading(false);
    }
  };

  const fmtTime = ts => new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const fmtDate = d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Collapsed button
  if (!open) return (
    <div style={{position:"fixed",bottom:20,right:20,zIndex:1000}}>
      <style>{`@keyframes chatPulse{0%,100%{box-shadow:0 4px 14px rgba(59,141,208,.3)}50%{box-shadow:0 4px 24px rgba(59,141,208,.6)}}`}</style>
      <button
        onClick={()=>setOpen(true)}
        title="Training Assistant"
        style={{width:56,height:56,borderRadius:28,border:"none",background:`linear-gradient(135deg,${B.blue},${B.blueD})`,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",animation:chats.length===0?"chatPulse 2s ease-in-out 3":"none",boxShadow:"0 4px 14px rgba(59,141,208,.3)",transition:"transform .2s"}}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.08)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span style={{position:"absolute",top:-2,right:-2,background:"linear-gradient(135deg,#a855f7,#7c3aed)",color:"#fff",fontSize:8,fontWeight:700,padding:"2px 5px",borderRadius:8,letterSpacing:.5}}>AI</span>
      </button>
    </div>
  );

  // Expanded chat panel
  return (
    <div className="r-chat-panel" style={{position:"fixed",bottom:20,right:20,zIndex:1000,width:580,height:520,borderRadius:16,background:"#fff",boxShadow:"0 8px 40px rgba(0,0,0,.15)",display:"flex",flexDirection:"row",overflow:"hidden",fontFamily:"'DM Sans',sans-serif"}}>
      {/* History sidebar */}
      <div className="r-chat-sidebar" style={{width:200,minWidth:200,background:"#f8fafc",borderRight:`1px solid ${B.bdr}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"12px 12px 8px",borderBottom:`1px solid ${B.bdr}`}}>
          <button onClick={startNewChat} style={{width:"100%",padding:"7px 0",border:`1px solid ${B.blue}`,borderRadius:8,background:"#fff",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ New Chat</button>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {chats.map(c => (
            <div key={c.id} onClick={()=>switchChat(c.id)}
              style={{padding:"10px 12px",cursor:"pointer",borderBottom:`1px solid ${B.bdr}`,background:c.id===activeId?B.blueL:"transparent",transition:"background .1s"}}
              onMouseEnter={e=>{if(c.id!==activeId)e.currentTarget.style.background="#f1f5f9"}}
              onMouseLeave={e=>{if(c.id!==activeId)e.currentTarget.style.background="transparent"}}
            >
              <div style={{fontSize:11,fontWeight:c.id===activeId?600:500,color:B.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
              <div style={{fontSize:9,color:B.t3,marginTop:2,display:"flex",justifyContent:"space-between"}}>
                <span>{fmtDate(c.date)}</span>
                <span>{c.messages.filter(m=>m.role==="user").length} msgs</span>
              </div>
            </div>
          ))}
          {chats.length === 0 && <div style={{padding:16,fontSize:11,color:B.t3,textAlign:"center"}}>No conversations yet</div>}
        </div>
      </div>

      {/* Main chat area */}
      <div className="r-chat-body" style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",borderLeft:`1px solid ${B.bdr}`}}>
        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${B.blue},${B.blueD})`,padding:"14px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          {/* Mobile history toggle */}
          <button className="r-chat-history-toggle" onClick={()=>setShowHistory(!showHistory)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",padding:2,display:"none"}}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><line x1="3" y1="5" x2="17" y2="5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="13" y2="10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="15" x2="15" y2="15" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <div style={{width:30,height:30,borderRadius:15,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{color:"#fff",fontWeight:700,fontSize:14}}>Training Assistant</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:10}}>Ask me anything about your training</div>
          </div>
          <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",padding:4,display:"flex"}}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><line x1="5" y1="5" x2="15" y2="15" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><line x1="15" y1="5" x2="5" y2="15" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Mobile history drawer */}
        {showHistory && (
          <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,zIndex:2,background:"#fff",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:700,color:B.t1}}>Chat History</span>
              <button onClick={()=>setShowHistory(false)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><line x1="5" y1="5" x2="15" y2="15" stroke={B.t2} strokeWidth="2" strokeLinecap="round"/><line x1="15" y1="5" x2="5" y2="15" stroke={B.t2} strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{padding:"8px 12px"}}><button onClick={startNewChat} style={{width:"100%",padding:"8px 0",border:`1px solid ${B.blue}`,borderRadius:8,background:"#fff",color:B.blue,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ New Chat</button></div>
            <div style={{flex:1,overflowY:"auto"}}>
              {chats.map(c => (
                <div key={c.id} onClick={()=>switchChat(c.id)} style={{padding:"12px 16px",cursor:"pointer",borderBottom:`1px solid ${B.bdr}`,background:c.id===activeId?B.blueL:"transparent"}}>
                  <div style={{fontSize:12,fontWeight:c.id===activeId?600:500,color:B.t1}}>{c.title}</div>
                  <div style={{fontSize:10,color:B.t3,marginTop:2}}>{fmtDate(c.date)} — {c.messages.filter(m=>m.role==="user").length} messages</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
          {/* Welcome message */}
          {msgs.length === 0 && (
            <div style={{background:B.blueL,borderRadius:"12px 12px 12px 4px",padding:"12px 14px",maxWidth:"90%",fontSize:13,lineHeight:1.6,color:B.t1}}>
              Hi! 👋 I'm your Training Assistant. I can help you with:
              <ul style={{margin:"8px 0 0",paddingLeft:18,fontSize:12,color:B.t2}}>
                <li>Tax concepts from your training modules</li>
                <li>Firm procedures and workflows</li>
                <li>ClickUp, Front, and other tool questions</li>
                <li>Advisory meeting preparation</li>
              </ul>
              What can I help you with?
            </div>
          )}

          {/* Suggested questions */}
          {msgs.length === 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {SUGGESTED_QUESTIONS.map(q => (
                <button key={q} onClick={()=>sendMessage(q)} style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${B.blueM}`,background:"#fff",color:B.blue,fontSize:11,fontWeight:500,cursor:"pointer",transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=B.blueL;e.currentTarget.style.borderColor=B.blue}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor=B.blueM}}
                >{q}</button>
              ))}
            </div>
          )}

          {/* Message bubbles */}
          {msgs.map((m, i) => (
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{
                maxWidth:"85%",padding:"10px 14px",borderRadius:m.role==="user"?"12px 12px 4px 12px":"12px 12px 12px 4px",
                background:m.role==="user"?B.blue:m.error?"#fef2f2":B.blueL,
                color:m.role==="user"?"#fff":m.error?B.err:B.t1,
                fontSize:13,lineHeight:1.55,whiteSpace:"pre-wrap",wordBreak:"break-word",
              }}>
                {m.content}
                {m.error && retryMsg && (
                  <button onClick={()=>{
                    setChats(prev=>prev.map(c=>c.id===activeId?{...c,messages:c.messages.filter((_,j)=>j!==i)}:c));
                    sendMessage(retryMsg);
                  }} style={{display:"block",marginTop:8,padding:"4px 10px",borderRadius:6,border:`1px solid ${B.err}`,background:"#fff",color:B.err,fontSize:11,fontWeight:600,cursor:"pointer"}}>Retry</button>
                )}
              </div>
              <span style={{fontSize:9,color:B.t3,marginTop:3,paddingInline:4}}>{fmtTime(m.ts)}</span>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{display:"flex",alignItems:"flex-start"}}>
              <div style={{background:B.blueL,borderRadius:"12px 12px 12px 4px",padding:"10px 18px",display:"flex",gap:4,alignItems:"center"}}>
                <style>{`@keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}`}</style>
                {[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:3,background:B.t3,display:"block",animation:`dotBounce .6s ${i*.15}s ease-in-out infinite`}}/>)}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{borderTop:`1px solid ${B.bdr}`,padding:"10px 12px",display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          <input
            ref={inputRef}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage(input)}}}
            placeholder="Ask a question..."
            disabled={loading||cooldown}
            style={{flex:1,padding:"10px 14px",borderRadius:24,border:`1px solid ${B.bdr}`,fontSize:13,outline:"none",fontFamily:"inherit",background:loading||cooldown?"#f9fafb":"#fff",transition:"border-color .15s"}}
            onFocus={e=>e.target.style.borderColor=B.blue}
            onBlur={e=>e.target.style.borderColor=B.bdr}
          />
          <button
            onClick={()=>sendMessage(input)}
            disabled={!input.trim()||loading||cooldown}
            style={{width:38,height:38,borderRadius:19,border:"none",background:!input.trim()||loading||cooldown?"#e2e8f0":`linear-gradient(135deg,${B.blue},${B.blueD})`,color:"#fff",cursor:!input.trim()||loading||cooldown?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 10h14M11 4l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// AI Log modal for admin view
function AiLogModal({ traineeName, onClose }) {
  const chats = loadChats(traineeName);
  const totalQuestions = chats.reduce((a, c) => a + c.messages.filter(m => m.role === "user").length, 0);
  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.4)",fontFamily:"'DM Sans',sans-serif"}} onClick={onClose}>
      <div style={{width:560,maxHeight:"80vh",background:"#fff",borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,.2)",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:B.navy}}>AI Chat Log — {traineeName}</div>
            <div style={{fontSize:11,color:B.t3,marginTop:2}}>{chats.length} conversation{chats.length!==1?"s":""} · {totalQuestions} question{totalQuestions!==1?"s":""}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex"}}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><line x1="5" y1="5" x2="15" y2="15" stroke={B.t2} strokeWidth="2" strokeLinecap="round"/><line x1="15" y1="5" x2="5" y2="15" stroke={B.t2} strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:0}}>
          {chats.length === 0 && <div style={{padding:32,textAlign:"center",color:B.t3,fontSize:13}}>No AI conversations recorded for this trainee.</div>}
          {chats.map(c => {
            const userMsgs = c.messages.filter(m => m.role === "user");
            return (
              <details key={c.id} style={{borderBottom:`1px solid ${B.bdr}`}}>
                <summary style={{padding:"12px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,fontSize:13,color:B.t1,listStyle:"none"}}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{flexShrink:0,transition:"transform .15s"}}><path d="M3 1l4 4-4 4" stroke={B.t3} strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                    <div style={{fontSize:10,color:B.t3,marginTop:1}}>{new Date(c.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · {c.messages.length} messages ({userMsgs.length} questions)</div>
                  </div>
                </summary>
                <div style={{padding:"0 20px 16px",marginLeft:22}}>
                  {c.messages.map((m, i) => (
                    <div key={i} style={{padding:"6px 0",borderTop:i>0?`1px solid #f1f5f9`:"none"}}>
                      <span style={{fontSize:10,fontWeight:600,color:m.role==="user"?B.blue:B.t3,textTransform:"uppercase",letterSpacing:.5}}>{m.role==="user"?"Trainee":"Assistant"}</span>
                      <div style={{fontSize:12,color:B.t1,marginTop:2,lineHeight:1.5,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{m.content}</div>
                      {m.ts && <div style={{fontSize:9,color:B.t3,marginTop:2}}>{new Date(m.ts).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</div>}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AiQuestionCount({ traineeName }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    try {
      const chats = loadChats(traineeName);
      const total = chats.reduce((a, c) => a + c.messages.filter(m => m.role === "user").length, 0);
      setCount(total);
    } catch { /* ignore */ }
  }, [traineeName]);
  if (count === 0) return null;
  return (
    <span style={{fontSize:9,color:B.t3,display:"flex",alignItems:"center",gap:3,marginLeft:2}} title={`${count} question${count!==1?"s":""} asked to Training Assistant`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke={B.t3} strokeWidth="2"/></svg>
      {count}
    </span>
  );
}

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

// ─── Milestone & Badge Icons ────────────────────────────────────────────────

const TrophySvg = ({ size = 22, color = "#d1d5db", glow = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow ? {filter:`drop-shadow(0 0 6px ${color})`,transition:"filter .5s"} : {transition:"filter .5s"}}>
    <path d="M7 4h10v6a5 5 0 01-10 0V4z" fill={color} opacity=".2"/>
    <path d="M7 4h10v6a5 5 0 01-10 0V4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M7 6H4.5a1 1 0 00-1 1v1a3.5 3.5 0 003.5 3.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M17 6h2.5a1 1 0 011 1v1A3.5 3.5 0 0117 11.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="12" y1="15" x2="12" y2="18" stroke={color} strokeWidth="1.5"/>
    <line x1="8" y1="18" x2="16" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const BADGE_ICONS = {
  communicator: (sz=16,cl=B.blue)=><svg width={sz} height={sz} viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="9" rx="2" stroke={cl} strokeWidth="1.3"/><path d="M1 5l7 4 7-4" stroke={cl} strokeWidth="1.3"/></svg>,
  learner: (sz=16,cl=B.warn)=><svg width={sz} height={sz} viewBox="0 0 16 16" fill="none"><path d="M9 1L6 8h4l-3 7" stroke={cl} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  teamplayer: (sz=16,cl=B.purple)=><svg width={sz} height={sz} viewBox="0 0 16 16" fill="none"><path d="M8 1l1.76 3.56L14 5.27l-3 2.93.71 4.13L8 10.27l-3.71 2.06.71-4.13-3-2.93 4.24-.71L8 1z" stroke={cl} strokeWidth="1.3" strokeLinejoin="round"/></svg>,
  detail: (sz=16,cl=B.blue)=><svg width={sz} height={sz} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke={cl} strokeWidth="1.3"/><line x1="10.5" y1="10.5" x2="14" y2="14" stroke={cl} strokeWidth="1.5" strokeLinecap="round"/></svg>,
  starter: (sz=16,cl=B.ok)=><svg width={sz} height={sz} viewBox="0 0 16 16" fill="none"><path d="M8 1v4M8 11v4M1 8h4M11 8h4M3.5 3.5l2.8 2.8M9.7 9.7l2.8 2.8M3.5 12.5l2.8-2.8M9.7 6.3l2.8-2.8" stroke={cl} strokeWidth="1.3" strokeLinecap="round"/></svg>,
};

const MILESTONES = [
  { id: "day30", label: "30-Day Milestone", color: "#CD7F32", phaseIds: ["week1","week2","week3","week4"] },
  { id: "day60", label: "60-Day Milestone", color: "#C0C0C0", phaseIds: ["week5_8"] },
  { id: "day90", label: "90-Day Graduation", color: "#FFD700", phaseIds: ["week9_12"] },
];

const getMilestoneStatus = (completedTasks) => {
  return MILESTONES.map(m => {
    const phases = PHASES.filter(p => m.phaseIds.includes(p.id));
    const allTasks = phases.flatMap(p => p.items.flatMap(i => i.tasks));
    const done = allTasks.filter(t => completedTasks?.[t.id]).length;
    return { ...m, done, total: allTasks.length, unlocked: allTasks.length > 0 && done === allTasks.length };
  });
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const totalTasks = PHASES.reduce((a,p)=>a+p.items.reduce((b,i)=>b+i.tasks.length,0),0);
const totalQuizzes = PHASES.reduce((a,p)=>a+p.items.filter(i=>i.quiz).length,0);

// Normalize old single-question quiz format to new multi-question format
const normalizeQuiz = (quiz) => {
  if (!quiz) return null;
  if (quiz.questions) return quiz;
  return { questions: [{ id: "q1", type: "multiple_choice", question: quiz.question, options: quiz.options, correct: quiz.correct }] };
};

// Check if quiz is passed — handles both old (true) and new ({passed:true,...}) formats
const isQuizPassed = (qs, itemId) => {
  const r = qs?.[itemId];
  return r === true || r?.passed === true;
};

const calcProg = (ts,qs) => {
  const d = Object.values(ts||{}).filter(Boolean).length;
  const p = Object.keys(qs||{}).filter(k => isQuizPassed(qs, k)).length;
  return { doneTasks: d, passedQuizzes: p, pct: totalTasks > 0 ? Math.round(d/totalTasks*100) : 0 };
};
const phaseProg = (phase,ts) => { const a=phase.items.flatMap(i=>i.tasks),d=a.filter(t=>ts?.[t.id]).length; return a.length?Math.round(d/a.length*100):0; };
const itemProg = (item,ts) => { const d=item.tasks.filter(t=>ts?.[t.id]).length; return item.tasks.length?Math.round(d/item.tasks.length*100):0; };
const daysSince = s => Math.max(0,Math.floor((new Date()-new Date(s))/864e5));
const pMeta = [{ids:["week1","week2","week3","week4"],label:"Days 1–30",color:B.blue},{ids:["week5_8"],label:"Days 31–60",color:B.purple},{ids:["week9_12"],label:"Days 61–90",color:B.ok}];

// ═════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [error, setError] = useState("");

  const allAccounts = [...MOCK_ADMINS, ...MOCK_TRAINEES, ...MOCK_CLIENTS];

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = allAccounts.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (found) { setError(""); onLogin(found); }
    else { setError("No account found with that email."); }
  };

  const inputStyle = {width:"100%",padding:"12px 14px",border:`1px solid ${B.bdr}`,borderRadius:10,background:"#fff",fontFamily:"inherit",fontSize:14,color:B.t1,outline:"none",transition:"border-color .2s",boxSizing:"border-box"};
  const roleBadge = (role) => {
    const colors = { admin: { bg: B.blueL, color: B.blue }, trainee: { bg: B.purpleL, color: B.purple }, client: { bg: B.okBg, color: B.ok } };
    const c = colors[role] || colors.trainee;
    return { fontSize:10, fontWeight:600, color:c.color, background:c.bg, padding:"3px 8px", borderRadius:6, textTransform:"uppercase" };
  };
  const avatarBg = (role) => role === "admin" ? B.navy : role === "client" ? B.ok : B.blue;

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${B.navy} 0%,#0f172a 50%,#1e293b 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:24}}>
      <div style={{position:"fixed",inset:0,opacity:.03,backgroundImage:`linear-gradient(${B.blue} 1px,transparent 1px),linear-gradient(90deg,${B.blue} 1px,transparent 1px)`,backgroundSize:"40px 40px"}}/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:440}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:14,marginBottom:12}}>
            <Logo size={44}/>
            <div style={{textAlign:"left"}}>
              <div style={{fontWeight:700,fontSize:18,color:"#fff",letterSpacing:.5}}>AIOLA CPA, PLLC</div>
            </div>
          </div>
        </div>
        <div style={{background:"#fff",borderRadius:16,padding:"36px 32px",boxShadow:"0 25px 50px rgba(0,0,0,.25)"}}>
          <h2 style={{margin:"0 0 6px",fontSize:22,fontWeight:700,color:B.navy,textAlign:"center"}}>Welcome Back</h2>
          <p style={{margin:"0 0 28px",fontSize:13,color:B.t3,textAlign:"center"}}>Sign in with your Aiola CPA credentials</p>
          <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:B.t2,marginBottom:6}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@aiolacpa.com" style={inputStyle}
                onFocus={e=>{e.target.style.borderColor=B.blue}} onBlur={e=>{e.target.style.borderColor=B.bdr}}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:B.t2,marginBottom:6}}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" style={inputStyle}
                onFocus={e=>{e.target.style.borderColor=B.blue}} onBlur={e=>{e.target.style.borderColor=B.bdr}}/>
            </div>
            {error && <div style={{fontSize:12,color:B.err,textAlign:"center"}}>{error}</div>}
            <button type="submit" style={{width:"100%",padding:"14px 20px",border:"none",borderRadius:10,background:B.blue,cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600,color:"#fff",transition:"all .2s",boxShadow:"0 2px 8px rgba(59,141,208,.3)"}}
              onMouseEnter={e=>{e.currentTarget.style.background=B.blueD}} onMouseLeave={e=>{e.currentTarget.style.background=B.blue}}>
              Sign In
            </button>
          </form>
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
                  <div style={{width:36,height:36,borderRadius:18,background:avatarBg(u.role),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{u.avatar}</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:B.t1}}>{u.name}</div><div style={{fontSize:11,color:B.t3}}>{u.email}</div></div>
                  <div style={{marginLeft:"auto",...roleBadge(u.role)}}>ADMIN</div>
                </button>
              ))}
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:B.t3,padding:"12px 0 4px"}}>Trainee</div>
              {MOCK_TRAINEES.map(u=>(
                <button key={u.id} onClick={()=>onLogin(u)} style={{width:"100%",padding:"12px 16px",border:`1px solid ${B.bdr}`,borderRadius:8,background:"#fff",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:12,transition:"all .15s",textAlign:"left"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=B.blueL;e.currentTarget.style.borderColor=B.blue}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor=B.bdr}}>
                  <div style={{width:36,height:36,borderRadius:18,background:avatarBg(u.role),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{u.avatar}</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:B.t1}}>{u.name}</div><div style={{fontSize:11,color:B.t3}}>{u.email}</div></div>
                  <div style={{marginLeft:"auto",...roleBadge(u.role)}}>TRAINEE</div>
                </button>
              ))}
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:B.t3,padding:"12px 0 4px"}}>Client</div>
              {MOCK_CLIENTS.map(u=>(
                <button key={u.id} onClick={()=>onLogin(u)} style={{width:"100%",padding:"12px 16px",border:`1px solid ${B.bdr}`,borderRadius:8,background:"#fff",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:12,transition:"all .15s",textAlign:"left"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=B.blueL;e.currentTarget.style.borderColor=B.blue}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor=B.bdr}}>
                  <div style={{width:36,height:36,borderRadius:18,background:avatarBg(u.role),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{u.avatar}</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:B.t1}}>{u.name}</div><div style={{fontSize:11,color:B.t3}}>{u.email}</div></div>
                  <div style={{marginLeft:"auto",...roleBadge(u.role)}}>CLIENT</div>
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
// CLIENT PORTAL DEMO
// ═════════════════════════════════════════════════════════════════════════════

const CLIENT_TODO_ITEMS = [
  { id: "ct1", text: "Accept invitation to our client portal", schedule: false },
  { id: "ct2", text: "Complete our Advisory Onboarding Questionnaire", schedule: false },
  { id: "ct3", text: "Schedule onboarding meeting with Sam", schedule: true },
  { id: "ct4", text: "Schedule initial strategy meeting with Nick & Sam", schedule: true },
  { id: "ct5", text: "Schedule follow up tax planning meeting with Sam", schedule: true },
  { id: "ct6", text: "Schedule check up meeting with Sam", schedule: true },
  { id: "ct7", text: "Time log review", schedule: false },
  { id: "ct8", text: "Year to date review of books", schedule: false },
];

const CLIENT_ENGAGEMENT_PHASES = [
  { id: "cp1", title: "Phase 1: Onboarding", items: ["Accept portal invitation", "Complete questionnaire", "Schedule onboarding meeting"], total: 3 },
  { id: "cp2", title: "Phase 2: Tax Planning & Strategy", items: [], total: 0 },
  { id: "cp3", title: "Phase 3: Ongoing Support & Implementation", items: [], total: 0 },
];

const ADVISORY_CLIENTS = [
  { id: "F-1001", name: "Jordan M.", tier: "Premium", email: "jordan.m@email.com", phase: "Tax Planning", completedTodos: 5, totalTodos: 8, onboardDate: "2025-01-15", flagged: false },
  { id: "F-1002", name: "Taylor R.", tier: "Premium", email: "taylor.r@email.com", phase: "Onboarding", completedTodos: 2, totalTodos: 8, onboardDate: "2025-03-01", flagged: false },
  { id: "F-1003", name: "Casey P.", tier: "Standard", email: "casey.p@email.com", phase: "Ongoing Support", completedTodos: 7, totalTodos: 8, onboardDate: "2024-11-10", flagged: false },
  { id: "F-1004", name: "Morgan L.", tier: "Standard", email: "morgan.l@email.com", phase: "Onboarding", completedTodos: 1, totalTodos: 8, onboardDate: "2025-02-20", flagged: true },
  { id: "F-1005", name: "Riley K.", tier: "Premium", email: "riley.k@email.com", phase: "Tax Planning", completedTodos: 4, totalTodos: 8, onboardDate: "2025-01-28", flagged: false },
  { id: "F-1006", name: "Drew S.", tier: "Standard", email: "drew.s@email.com", phase: "Onboarding", completedTodos: 3, totalTodos: 8, onboardDate: "2025-02-05", flagged: false },
];

function ClientPortalDemo() {
  const [cpTab, setCpTab] = useState("home");
  const [cpTodos, setCpTodos] = useState({});
  const [cpPhases, setCpPhases] = useState({ cp1: true });

  const todoCount = Object.values(cpTodos).filter(Boolean).length;

  const cpTabs = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "recordings", label: "Recordings & Deliverables", icon: "🎬" },
    { key: "templates", label: "Templates & Documents", icon: "📄" },
    { key: "partners", label: "Trusted Partners", icon: "🤝" },
    { key: "resources", label: "Resources", icon: "📚" },
  ];

  const cardS = { background: "#fff", border: `1px solid ${B.bdr}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.04)", overflow: "hidden" };
  const sectionTitle = { margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: B.navy };
  const pillBtn = (bg, color, border) => ({ padding: "6px 16px", borderRadius: 20, border: border || "none", background: bg, color, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" });

  return (
    <div>
      {/* Client name banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: "16px 20px", ...cardS }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: B.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>BK</div>
        <div><div style={{ fontSize: 18, fontWeight: 700, color: B.navy }}>Brandon & Jessica Kim</div><div style={{ fontSize: 12, color: B.t3, marginTop: 2 }}>Advisory Client — Aiola CPA, PLLC</div></div>
        <div style={{ marginLeft: "auto" }}><Logo size={32} /></div>
      </div>

      {/* Client Portal Tabs */}
      <div className="r-tab-row" style={{ display: "flex", gap: 20, marginBottom: 24, borderBottom: `1px solid ${B.bdr}`, overflowX: "auto" }}>
        {cpTabs.map(tab => (
          <button key={tab.key} onClick={() => setCpTab(tab.key)} style={{ padding: "10px 4px", border: "none", borderBottom: cpTab === tab.key ? `2px solid ${B.blue}` : "2px solid transparent", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: cpTab === tab.key ? B.blue : B.t3, fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, transition: "color .2s" }}>
            <span style={{ fontSize: 14 }}>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ── HOME TAB ── */}
      {cpTab === "home" && (
        <div>
          {/* Three-column layout */}
          <div className="r-three-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
            {/* Left: Welcome */}
            <div style={{ ...cardS, padding: 24 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, color: B.navy }}>Welcome!</h3>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: B.t2, lineHeight: 1.7 }}>
                Thank you for partnering with and placing your trust in Aiola CPA. We greatly appreciate our clients and take great pride in the services we provide. We'll do everything we can to exceed your expectations.
              </p>
              <p style={{ margin: 0, fontSize: 12, color: B.t2, lineHeight: 1.7 }}>
                Our focus is providing high-quality, proactive tax advisory services to real estate investors, and we value the importance of relationships and reliability. We are committed to being available year-round as your trusted tax advisors.
              </p>
            </div>

            {/* Middle: Table of Contents + Software */}
            <div style={{ ...cardS, padding: 24 }}>
              <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>Table of Contents</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                {cpTabs.map(t => (
                  <button key={t.key} onClick={() => setCpTab(t.key)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: B.blue, fontWeight: 500, textAlign: "left", padding: "3px 0", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>Add us to your software</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[
                  { name: "QuickBooks Online", role: "accountant" },
                  { name: "Stessa", role: "team member" },
                  { name: "Wave", role: "accountant" },
                  { name: "Baselane", role: "accountant" },
                  { name: "Buildium", role: "accountant" },
                ].map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: B.t2 }}>
                    <span style={{ color: B.blue, fontWeight: 500, cursor: "pointer" }}>{s.name}</span>{" "}
                    <span style={{ fontSize: 11, color: B.t3 }}>(add us as {s.role})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Helpful Links + Social */}
            <div style={{ ...cardS, padding: 24 }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: B.navy, textTransform: "uppercase", letterSpacing: .8 }}>Helpful Links</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {["Client Document Portal (Soraban)", "Billing & Payment", "Schedule a Meeting", "Blog", "Linktree", "Leave a Review!"].map((link, i) => (
                  <button key={i} style={{ width: "100%", padding: "10px 14px", border: "none", borderRadius: 8, background: B.navy, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "opacity .15s" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = ".85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                    {link}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {[
                  { label: "IG", title: "Instagram" },
                  { label: "FB", title: "Facebook" },
                  { label: "in", title: "LinkedIn" },
                  { label: "X", title: "X" },
                  { label: "YT", title: "YouTube" },
                ].map((s, i) => (
                  <div key={i} title={s.title} style={{ width: 30, height: 30, borderRadius: 15, background: B.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "transform .15s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Your Aiola CPA Team */}
          <h3 style={sectionTitle}>Your Aiola CPA Team</h3>
          <div className="r-team-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
            {[
              { initials: "SO", name: "Sam Ortiz", title: "Senior Tax Advisor", role: "Main Point of Contact", email: "sam@aiolacpa.com", phone: "(555) 123-4567", calendar: true },
              { initials: "NM", name: "Natalie Marcum", title: "Firm Administrator", role: "Admin/Billing Contact", email: "natalie@aiolacpa.com", phone: "(555) 234-5678", calendar: false },
              { initials: "NA", name: "Nick Aiola", title: "CEO", role: "Senior Relationship Contact", email: "nick@aiolacpa.com", phone: "(555) 345-6789", calendar: false },
            ].map((m, i) => (
              <div key={i} style={{ ...cardS, padding: 24, textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 28, background: B.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, margin: "0 auto 12px" }}>{m.initials}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: B.navy }}>{m.name}</div>
                <div style={{ fontSize: 12, color: B.t2, marginTop: 2 }}>{m.title}</div>
                <div style={{ fontSize: 11, color: B.t3, marginTop: 2, marginBottom: 12 }}>{m.role}</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                  <button style={pillBtn(B.blue, "#fff")}>Email</button>
                  <button style={pillBtn("#fff", B.blue, `1px solid ${B.blue}`)}>Phone</button>
                  {m.calendar && <button style={pillBtn(B.blueL, B.blue, `1px solid ${B.blueM}`)}>Calendar</button>}
                </div>
              </div>
            ))}
          </div>

          {/* Your To Do List */}
          <div style={{ ...cardS, marginBottom: 28 }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${B.bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: B.navy }}>Your To Do List</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: B.t2 }}>{todoCount}/{CLIENT_TODO_ITEMS.length}</span>
                <div style={{ width: 60, height: 6, borderRadius: 3, background: B.blueL, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: todoCount === CLIENT_TODO_ITEMS.length ? B.ok : B.blue, width: `${CLIENT_TODO_ITEMS.length ? (todoCount / CLIENT_TODO_ITEMS.length) * 100 : 0}%`, transition: "width .4s" }} />
                </div>
              </div>
            </div>
            {CLIENT_TODO_ITEMS.map((item, idx) => {
              const done = !!cpTodos[item.id];
              return (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: idx < CLIENT_TODO_ITEMS.length - 1 ? `1px solid ${B.bdr}` : "none", cursor: "pointer", transition: "background .15s", background: done ? B.okBg : "transparent" }}
                  onClick={() => setCpTodos(p => ({ ...p, [item.id]: !p[item.id] }))}
                  onMouseEnter={e => { if (!done) e.currentTarget.style.background = "#fafbfc" }} onMouseLeave={e => { e.currentTarget.style.background = done ? B.okBg : "transparent" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: done ? "none" : `2px solid ${B.bdr}`, background: done ? B.ok : "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>{done && <Chk />}</div>
                  <span style={{ flex: 1, fontSize: 13, color: done ? B.t3 : B.t1, textDecoration: done ? "line-through" : "none" }}>{item.text}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 10, background: done ? B.okL : "#f1f5f9", color: done ? B.ok : B.t3 }}>{done ? "Complete" : "To-do"}</span>
                  {item.schedule && <button onClick={e => e.stopPropagation()} style={pillBtn(B.blue, "#fff")}>Schedule</button>}
                </div>
              );
            })}
          </div>

          {/* Tax Advisory Engagement */}
          <div style={{ ...cardS, marginBottom: 28 }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${B.bdr}` }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: B.navy }}>Tax Advisory Engagement</h3>
            </div>
            {CLIENT_ENGAGEMENT_PHASES.map((phase, idx) => {
              const isOpen = !!cpPhases[phase.id];
              const done = phase.total === 0 ? phase.total : 0;
              return (
                <div key={phase.id} style={{ borderBottom: idx < CLIENT_ENGAGEMENT_PHASES.length - 1 ? `1px solid ${B.bdr}` : "none" }}>
                  <button onClick={() => setCpPhases(p => ({ ...p, [phase.id]: !p[phase.id] }))}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                    <Chev open={isOpen} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: B.navy }}>{phase.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: phase.total === 0 ? B.ok : B.t3 }}>{done}/{phase.total}</span>
                    <div style={{ width: 50, height: 5, borderRadius: 3, background: B.blueL, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, background: phase.total === 0 ? B.ok : B.blue, width: phase.total === 0 ? "100%" : `${(done / phase.total) * 100}%`, transition: "width .4s" }} />
                    </div>
                  </button>
                  {isOpen && phase.items.length > 0 && (
                    <div style={{ padding: "0 20px 14px 46px" }}>
                      {phase.items.map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: 12, color: B.t2 }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${B.bdr}`, background: "#fff", flexShrink: 0 }} />
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                  {isOpen && phase.items.length === 0 && (
                    <div style={{ padding: "0 20px 14px 46px", fontSize: 12, color: B.t3, fontStyle: "italic" }}>No items yet — coming soon</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── RECORDINGS & DELIVERABLES TAB ── */}
      {cpTab === "recordings" && (
        <div>
          {/* Header banner */}
          <div style={{ background: B.navy, borderRadius: 12, padding: "28px 32px", marginBottom: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 16, right: 24, opacity: .15 }}><Logo size={60} /></div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>Recordings & Deliverables</h3>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,.6)" }}>Brandon & Jessica Kim — Advisory Engagement</p>
          </div>

          {/* Meeting Recordings */}
          <h4 style={sectionTitle}>Meeting Recordings</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {[
              { title: "Onboarding Meeting", date: "Apr 28, 2026", duration: "45 min" },
              { title: "Initial Strategy Meeting", date: "May 12, 2026", duration: "60 min" },
            ].map((rec, i) => (
              <div key={i} style={{ ...cardS, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: B.blueL, color: B.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2.5v11l9-5.5L4 2.5z" fill={B.blue} /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: B.navy }}>{rec.title}</div>
                  <div style={{ fontSize: 11, color: B.t3, marginTop: 2 }}>{rec.date} · {rec.duration}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: B.blue, background: B.blueL, padding: "4px 10px", borderRadius: 10 }}>Recording available</span>
              </div>
            ))}
          </div>

          {/* Deliverables */}
          <h4 style={sectionTitle}>Deliverables</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { title: "Tax Strategy Roadmap (TSR)", tag: "PDF", tagColor: B.blue, tagBg: B.blueL, icon: "dl" },
              { title: "Entity Structure Memo", tag: "Pending", tagColor: B.warn, tagBg: B.warnL, icon: "pending" },
            ].map((d, i) => (
              <div key={i} style={{ ...cardS, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: d.icon === "dl" ? B.blueL : B.warnL, color: d.icon === "dl" ? B.blue : B.warn, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {d.icon === "dl" ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" stroke={B.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke={B.warn} strokeWidth="1.5" /><path d="M8 5v3.5l2 1.5" stroke={B.warn} strokeWidth="1.5" strokeLinecap="round" /></svg>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: B.navy }}>{d.title}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: d.tagColor, background: d.tagBg, padding: "4px 10px", borderRadius: 10 }}>{d.tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TEMPLATES & DOCUMENTS TAB ── */}
      {cpTab === "templates" && (
        <div>
          <h3 style={sectionTitle}>Templates & Documents</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { title: "Time Log Template", desc: "Track your material participation hours" },
              { title: "Estimated Tax Payment Calculator", desc: "Calculate quarterly 1040-ES payments" },
              { title: "Entity Structure Checklist", desc: "LLC, S-Corp, and partnership setup guide" },
              { title: "Cost Segregation Worksheet", desc: "Evaluate cost seg study ROI" },
              { title: "Rental Property Analyzer", desc: "Analyze STR investment returns" },
              { title: "Mileage & Expense Tracker", desc: "Track deductible business expenses" },
            ].map((t, i) => (
              <div key={i} style={{ ...cardS, padding: 20, display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: B.blueL, color: B.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h5.59L13 4.91V14.5H4V1.5z" stroke={B.blue} strokeWidth="1.3" /><path d="M9.5 1.5V5H13" stroke={B.blue} strokeWidth="1.3" /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: B.navy, marginBottom: 4 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: B.t3, lineHeight: 1.4 }}>{t.desc}</div>
                </div>
                <button style={pillBtn(B.blue, "#fff")}>Download</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TRUSTED PARTNERS TAB ── */}
      {cpTab === "partners" && (
        <div>
          <h3 style={sectionTitle}>Trusted Partners</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { name: "Madison SPECS", specialty: "Cost Segregation Studies" },
              { name: "Anderson Legal Group", specialty: "Real Estate Attorney" },
              { name: "Pinnacle Lending", specialty: "Investment Property Financing" },
              { name: "SecureEntity LLC", specialty: "LLC Formation & Registered Agent" },
              { name: "BookRight Pro", specialty: "Bookkeeping Services" },
              { name: "InsureWell Advisors", specialty: "Rental Property Insurance" },
            ].map((p, i) => (
              <div key={i} style={{ ...cardS, padding: 20, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: B.blueL, color: B.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{p.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: B.navy }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: B.t3, marginTop: 2 }}>{p.specialty}</div>
                </div>
                <button style={pillBtn("#fff", B.blue, `1px solid ${B.blue}`)}>Learn More</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RESOURCES TAB ── */}
      {cpTab === "resources" && (
        <div>
          {/* Blog Posts */}
          <h3 style={sectionTitle}>Blog Posts & Articles</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {[
              { title: "The STR Loophole: How to Offset W-2 Income with Rental Losses", date: "Mar 2026" },
              { title: "S-Corp vs LLC: When Does the Election Make Sense?", date: "Feb 2026" },
              { title: "Year-End Tax Planning Checklist for Real Estate Investors", date: "Dec 2025" },
            ].map((post, i) => (
              <div key={i} style={{ ...cardS, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: B.blueL, color: B.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h4.5c1 0 1.5.5 1.5 1.5v10c0-.83-.67-1.5-1.5-1.5H2V2z" stroke={B.blue} strokeWidth="1.5" /><path d="M14 2H9.5C8.5 2 8 2.5 8 3.5v10c0-.83.67-1.5 1.5-1.5H14V2z" stroke={B.blue} strokeWidth="1.5" /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: B.navy }}>{post.title}</div>
                  <div style={{ fontSize: 11, color: B.t3, marginTop: 2 }}>{post.date}</div>
                </div>
                <button style={pillBtn("#fff", B.blue, `1px solid ${B.blue}`)}>Read</button>
              </div>
            ))}
          </div>

          {/* Video Library */}
          <h3 style={sectionTitle}>Video Library</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
            {[
              { title: "Understanding Material Participation for STR Owners", embedId: "dQw4w9WgXcQ" },
              { title: "How Cost Segregation Can Save You Thousands", embedId: "dQw4w9WgXcQ" },
            ].map((v, i) => (
              <div key={i} style={{ ...cardS, overflow: "hidden" }}>
                <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                  <iframe src={`https://www.youtube.com/embed/${v.embedId}`} title={v.title} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: B.navy }}>{v.title}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Soraban Tutorial */}
          <h3 style={sectionTitle}>Soraban Tutorial</h3>
          <div style={{ ...cardS, padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: B.blueL, color: B.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h5.59L13 4.91V14.5H4V1.5z" stroke={B.blue} strokeWidth="1.3" /><path d="M9.5 1.5V5H13" stroke={B.blue} strokeWidth="1.3" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: B.navy }}>Client Document Portal (Soraban)</div>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: B.t2, lineHeight: 1.5 }}>Upload tax documents, download deliverables, and securely share files with your Aiola CPA team. Click below to access your personalized document portal.</p>
            </div>
            <button style={pillBtn(B.blue, "#fff")}>Open Portal</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN CLIENT LIST
// ═════════════════════════════════════════════════════════════════════════════

function AdminClientList() {
  const [clients, setClients] = useState(ADVISORY_CLIENTS);
  const [archived, setArchived] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [viewingClient, setViewingClient] = useState(null);
  const [confirmOffboard, setConfirmOffboard] = useState(null);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null); // "Onboarding" | "Needs Attention" | null

  const getStatus = (c) => {
    if (c.flagged) return "Needs Attention";
    const pct = Math.round(c.completedTodos / c.totalTodos * 100);
    return pct < 50 ? "Onboarding" : "Active";
  };
  const statusPill = (status) => {
    const m = { "Onboarding": { bg: "#fef9c3", color: "#a16207" }, "Active": { bg: B.okBg || "#dcfce7", color: B.ok }, "Needs Attention": { bg: "#fee2e2", color: B.err } };
    const s = m[status] || m["Active"];
    return { fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 10, display: "inline-block", textAlign: "center", color: s.color, background: s.bg, whiteSpace: "nowrap" };
  };

  const active = clients;
  const avgCompletion = active.length > 0 ? Math.round(active.reduce((a, c) => a + (c.completedTodos / c.totalTodos * 100), 0) / active.length) : 0;
  const onboarding = active.filter(c => getStatus(c) === "Onboarding").length;
  const needsAttention = active.filter(c => getStatus(c) === "Needs Attention").length;

  // Filter by status pill
  let filtered = statusFilter ? active.filter(c => getStatus(c) === statusFilter) : active;
  // Filter by search
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.tier.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }
  // Sort
  if (sortCol) {
    const sorted = [...filtered].sort((a, b) => {
      let va, vb;
      if (sortCol === "id") { va = a.id; vb = b.id; }
      else if (sortCol === "name") { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortCol === "tier") { va = a.tier; vb = b.tier; }
      else if (sortCol === "pct") { va = a.completedTodos / a.totalTodos; vb = b.completedTodos / b.totalTodos; }
      else { va = ""; vb = ""; }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    filtered = sorted;
  }

  const handleSort = (col) => {
    if (sortCol === col) { setSortAsc(!sortAsc); } else { setSortCol(col); setSortAsc(true); }
  };
  const sortIcon = (col) => sortCol === col ? (sortAsc ? " ↑" : " ↓") : "";

  const exportCsv = () => {
    const header = "Client ID,Name,Tier,Email,% Complete,Status,Onboard Date";
    const rows = filtered.map(c => {
      const pct = Math.round(c.completedTodos / c.totalTodos * 100);
      return `${c.id},"${c.name}",${c.tier},${c.email},${pct}%,${getStatus(c)},${c.onboardDate || ""}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aiola-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const offboard = (client) => {
    setClients(p => p.filter(c => c.id !== client.id));
    setArchived(p => [...p, client]);
    setConfirmOffboard(null);
  };
  const restore = (client) => {
    setArchived(p => p.filter(c => c.id !== client.id));
    setClients(p => [...p, client]);
  };

  const sortableHeader = (label, col) => (
    <span onClick={() => handleSort(col)} style={{ cursor: "pointer", userSelect: "none" }}>{label}{sortIcon(col)}</span>
  );

  if (viewingClient) {
    return (
      <div>
        <button onClick={() => setViewingClient(null)} style={{padding:"8px 18px",border:`1px solid ${B.blue}`,borderRadius:8,background:"#fff",color:B.blue,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginBottom:20}}>← Back to Client List</button>
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${B.bdr}`,padding:"18px 24px",marginBottom:20,display:"flex",alignItems:"center",gap:16,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
          <div style={{width:44,height:44,borderRadius:22,background:viewingClient.tier==="Premium"?B.purple:B.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>{viewingClient.name.split(" ").map(w=>w[0]).join("")}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:700,color:B.navy}}>{viewingClient.name}</div>
            <div style={{fontSize:12,color:B.t3}}>{viewingClient.email} · {viewingClient.id} · {viewingClient.phase}</div>
          </div>
          <span style={{fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:10,color:viewingClient.tier==="Premium"?B.purple:B.blue,background:viewingClient.tier==="Premium"?B.purpleL:B.blueL}}>{viewingClient.tier}</span>
        </div>
        <ClientPortalDemo />
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="r-stat-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
        <div style={{background:"#fff",borderRadius:12,padding:20,border:`1px solid ${B.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)",borderLeft:`4px solid ${B.blue}`}}>
          <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3,marginBottom:8}}>Active Clients</div>
          <div style={{fontSize:28,fontWeight:700,color:B.blue}}>{active.length}</div>
        </div>
        <div style={{background:"#fff",borderRadius:12,padding:20,border:`1px solid ${B.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)",borderLeft:`4px solid ${B.ok}`}}>
          <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3,marginBottom:8}}>Avg Completion</div>
          <div style={{fontSize:28,fontWeight:700,color:B.ok}}>{avgCompletion}%</div>
        </div>
        <div onClick={()=>setStatusFilter(f=>f==="Onboarding"?null:"Onboarding")} style={{background:"#fff",borderRadius:12,padding:20,border:`1px solid ${statusFilter==="Onboarding"?B.purple:B.bdr}`,boxShadow:statusFilter==="Onboarding"?"0 0 0 2px "+B.purpleL:"0 1px 3px rgba(0,0,0,.04)",borderLeft:`4px solid ${B.purple}`,cursor:"pointer",transition:"all .15s"}}>
          <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3,marginBottom:8}}>In Onboarding</div>
          <div style={{fontSize:28,fontWeight:700,color:B.purple}}>{onboarding}</div>
        </div>
        <div onClick={()=>setStatusFilter(f=>f==="Needs Attention"?null:"Needs Attention")} style={{background:"#fff",borderRadius:12,padding:20,border:`1px solid ${statusFilter==="Needs Attention"?"#fecaca":needsAttention>0?"#fecaca":B.bdr}`,boxShadow:statusFilter==="Needs Attention"?"0 0 0 2px #fee2e2":"0 1px 3px rgba(0,0,0,.04)",borderLeft:`4px solid ${needsAttention>0?B.err:B.ok}`,cursor:"pointer",transition:"all .15s"}}>
          <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3,marginBottom:8}}>Needs Attention</div>
          <div style={{fontSize:28,fontWeight:700,color:needsAttention>0?B.err:B.ok}}>{needsAttention}</div>
          <div style={{fontSize:10,color:B.t3,marginTop:2}}>Flagged</div>
        </div>
      </div>
      {/* Client Table */}
      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${B.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)",overflow:"hidden"}}>
        <div style={{padding:"18px 24px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <h2 style={{margin:0,fontSize:16,fontWeight:700,color:B.navy,flex:1}}>Advisory Clients</h2>
          {statusFilter && <button onClick={()=>setStatusFilter(null)} style={{padding:"4px 12px",border:`1px solid ${B.bdr}`,borderRadius:14,background:"#f8fafc",color:B.t2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>Showing: {statusFilter} <span style={{fontWeight:700}}>×</span></button>}
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, client ID, or tier..." style={{padding:"8px 14px",border:`1px solid ${B.bdr}`,borderRadius:8,fontSize:12,fontFamily:"inherit",width:260,outline:"none"}}/>
          <button onClick={exportCsv} style={{padding:"8px 16px",border:`1px solid ${B.blue}`,borderRadius:8,background:"#fff",color:B.blue,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h5.59L13 4.91V14.5H4V1.5z" stroke="currentColor" strokeWidth="1.3"/><path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.3"/><path d="M7 8v4m0 0l-2-2m2 2l2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Export CSV
          </button>
        </div>
        <div className="r-table-wrap">
        <div className="r-table-grid" style={{display:"grid",gridTemplateColumns:"80px 2fr 0.8fr 1.5fr 0.8fr 0.8fr 140px",padding:"12px 24px",borderBottom:`1px solid ${B.bdr}`,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:B.t3}}>
          {sortableHeader("Client ID","id")}{sortableHeader("Client Name","name")}{sortableHeader("Tier","tier")}<span>Email</span>{sortableHeader("% Complete","pct")}<span>Status</span><span></span>
        </div>
        {filtered.length===0&&<div style={{padding:"32px 24px",textAlign:"center",fontSize:13,color:B.t3}}>No clients match your search.</div>}
        {filtered.map(c=>{
          const pct=Math.round(c.completedTodos/c.totalTodos*100);
          const pctColor=pct>=80?B.ok:pct>=50?B.blue:pct>=30?B.warn:B.err;
          const status=getStatus(c);
          return(
            <div key={c.id} className="r-table-grid" style={{display:"grid",gridTemplateColumns:"80px 2fr 0.8fr 1.5fr 0.8fr 0.8fr 140px",padding:"14px 24px",borderBottom:`1px solid ${B.bdr}`,alignItems:"center",transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:11,fontWeight:600,color:B.t2,fontFamily:"monospace"}}>{c.id}</span>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:16,background:c.tier==="Premium"?B.purple:B.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{c.name.split(" ").map(w=>w[0]).join("")}</div>
                <div><div style={{fontSize:13,fontWeight:600,color:B.t1}}>{c.name}</div><div style={{fontSize:10,color:B.t3}}>{c.phase}</div></div>
              </div>
              <span style={{fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:10,display:"inline-block",textAlign:"center",color:c.tier==="Premium"?B.purple:B.blue,background:c.tier==="Premium"?B.purpleL:B.blueL}}>{c.tier}</span>
              <span style={{fontSize:12,color:B.t2}}>{c.email}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1,height:6,borderRadius:3,background:"#f1f5f9",overflow:"hidden",maxWidth:70}}><div style={{height:"100%",borderRadius:3,width:`${pct}%`,background:pctColor,transition:"width .4s"}}/></div>
                <span style={{fontSize:12,fontWeight:600,color:pctColor}}>{pct}%</span>
              </div>
              <span style={statusPill(status)}>{status}</span>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setViewingClient(c)} style={{padding:"5px 10px",border:`1px solid ${B.blue}`,borderRadius:6,background:"#fff",color:B.blue,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>View</button>
                <button onClick={()=>setConfirmOffboard(c)} style={{padding:"5px 10px",border:`1px solid ${B.err}`,borderRadius:6,background:"#fff",color:B.err,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Off-board</button>
              </div>
            </div>
          );
        })}
        </div>
      </div>
      {/* Archived Section */}
      {archived.length>0&&(
        <div style={{marginTop:20}}>
          <button onClick={()=>setShowArchived(!showArchived)} style={{display:"flex",alignItems:"center",gap:8,border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:B.t3,fontFamily:"inherit",padding:"8px 0"}}>
            <Chev open={showArchived}/> Archived Clients ({archived.length})
          </button>
          {showArchived&&(
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${B.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)",overflow:"hidden",opacity:.7}}>
              {archived.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px",borderBottom:`1px solid ${B.bdr}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:11,fontWeight:600,color:B.t3,fontFamily:"monospace"}}>{c.id}</span>
                    <span style={{fontSize:13,color:B.t3}}>{c.name}</span>
                    <span style={{fontSize:10,color:B.t3}}>{c.email}</span>
                  </div>
                  <button onClick={()=>restore(c)} style={{padding:"5px 12px",border:`1px solid ${B.ok}`,borderRadius:6,background:"#fff",color:B.ok,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Restore</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Off-board Confirmation Modal */}
      {confirmOffboard&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,fontFamily:"'DM Sans',sans-serif"}} onClick={()=>setConfirmOffboard(null)}>
          <div style={{background:"#fff",borderRadius:16,padding:"28px 32px",maxWidth:440,width:"90%",boxShadow:"0 25px 50px rgba(0,0,0,.2)"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:"0 0 12px",fontSize:18,fontWeight:700,color:B.navy}}>Off-board Client</h3>
            <p style={{margin:"0 0 20px",fontSize:13,color:B.t2,lineHeight:1.6}}>Are you sure you want to off-board <strong>{confirmOffboard.name}</strong>? This will archive their portal.</p>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setConfirmOffboard(null)} style={{padding:"8px 18px",border:`1px solid ${B.bdr}`,borderRadius:7,background:"#fff",color:B.t3,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={()=>offboard(confirmOffboard)} style={{padding:"8px 18px",border:"none",borderRadius:7,background:B.err,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Off-board</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

// Phase deadlines: how many days into the 90-day program each phase should be complete
const PHASE_DEADLINES = { week1: 7, week2: 14, week3: 21, week4: 30, week5_8: 60, week9_12: 90 };

// Get overdue tasks for a trainee: tasks in phases whose deadline has passed but aren't completed
const getOverdueTasks = (trainee, taskData) => {
  const days = daysSince(trainee.startDate);
  const overdue = [];
  for (const phase of PHASES) {
    const deadline = PHASE_DEADLINES[phase.id];
    if (days < deadline) continue;
    for (const item of phase.items) {
      for (const task of item.tasks) {
        if (!taskData?.[task.id]) overdue.push({ phase: phase.label, item: item.title, task: task.text, deadline });
      }
    }
  }
  return overdue;
};

// Get overdue quizzes for a trainee
const getOverdueQuizzes = (trainee, quizData) => {
  const days = daysSince(trainee.startDate);
  const overdue = [];
  for (const phase of PHASES) {
    const deadline = PHASE_DEADLINES[phase.id];
    if (days < deadline) continue;
    for (const item of phase.items) {
      if (item.quiz && !quizData?.[item.id]) overdue.push({ phase: phase.label, item: item.title, question: item.quiz.question, deadline });
    }
  }
  return overdue;
};

// ═════════════════════════════════════════════════════════════════════════════
// PDF REPORT GENERATION
// ═════════════════════════════════════════════════════════════════════════════

function generateMilestoneReport(trainee, traineeData, kpiData, notesData, { dateFrom, dateTo, isTraineeReport } = {}) {
  try {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  const blue = [59, 141, 208];
  const navy = [26, 26, 46];
  const gray = [90, 101, 119];
  const lightGray = [248, 249, 250];

  // Date range filtering helpers
  const rangeFrom = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
  const rangeTo = dateTo ? new Date(dateTo + "T23:59:59") : null;
  const inRange = (dateVal) => {
    if (!dateVal) return true;
    const d = new Date(dateVal);
    if (rangeFrom && d < rangeFrom) return false;
    if (rangeTo && d > rangeTo) return false;
    return true;
  };
  const rangeLbl = (rangeFrom && rangeTo) ? `${rangeFrom.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} – ${rangeTo.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}` : "";

  const tasks = traineeData?.tasks || {};
  const quizzes = traineeData?.quizzes || {};
  const kpi = kpiData || {};
  const allNotes = notesData?.notes || [];
  const notes = isTraineeReport
    ? allNotes.filter(n => n.visibility === "shared" && inRange(n.date))
    : allNotes.filter(n => inRange(n.date));
  const allBadges = notesData?.badges || [];
  const badges = allBadges.filter(b => !b.removed && inRange(b.date));
  const prog = calcProg(tasks, quizzes);
  const days = daysSince(trainee.startDate);
  const milestoneLabel = days <= 35 ? "30-Day" : days <= 65 ? "60-Day" : "90-Day";
  const timelinePct = Math.min(100, Math.round(days / 90 * 100));
  const phaseLbl = days <= 30 ? "Days 1-30" : days <= 60 ? "Days 31-60" : "Days 61-90";
  const milestones = getMilestoneStatus(tasks);
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const reportTitle = isTraineeReport ? "My Progress Report" : `${milestoneLabel} Performance Review`;

  // Helper: draw the Aiola logo using jsPDF drawing methods
  const drawLogo = (x, y, scale = 1) => {
    doc.setDrawColor(...blue);
    doc.setLineWidth(2 * scale);
    doc.line(x + 15 * scale, y + 35 * scale, x + 30 * scale, y + 10 * scale);
    doc.line(x + 30 * scale, y + 10 * scale, x + 45 * scale, y + 35 * scale);
    doc.setLineWidth(2.5 * scale);
    doc.line(x + 7 * scale, y + 35 * scale, x + 53 * scale, y + 35 * scale);
    doc.setLineWidth(1.5 * scale);
    doc.rect(x + 26 * scale, y + 22 * scale, x + 8 * scale, y + 13 * scale);
    doc.line(x + 35 * scale, y + 27 * scale, x + 50 * scale, y + 27 * scale);
    doc.line(x + 40 * scale, y + 22 * scale, x + 50 * scale, y + 22 * scale);
  };

  const sectionHeader = (title, yPos) => {
    doc.setFontSize(16);
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, yPos);
    doc.setDrawColor(...blue);
    doc.setLineWidth(1.5);
    doc.line(margin, yPos + 6, pageW - margin, yPos + 6);
    return yPos + 24;
  };

  const addFooter = (pageNum, totalPages) => {
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont("helvetica", "normal");
    doc.text("Aiola CPA, PLLC -- Confidential", margin, pageH - 25);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageW / 2, pageH - 25, { align: "center" });
    doc.text(trainee.name, pageW - margin, pageH - 25, { align: "right" });
  };

  // ── PAGE 1: Cover ──
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageW, pageH, "F");
  drawLogo(pageW / 2 - 30, 160, 2);

  doc.setFontSize(14);
  doc.setTextColor(...blue);
  doc.setFont("helvetica", "bold");
  doc.text("AIOLA CPA, PLLC", pageW / 2, 280, { align: "center" });

  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text(trainee.name, pageW / 2, 340, { align: "center" });

  doc.setFontSize(20);
  doc.setTextColor(...blue);
  doc.text(reportTitle, pageW / 2, 370, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(168, 208, 240);
  doc.text(isTraineeReport ? "Aiola CPA, PLLC" : "Prepared by Aiola CPA, PLLC", pageW / 2, 410, { align: "center" });
  doc.text(dateStr, pageW / 2, 430, { align: "center" });
  if (rangeLbl) {
    doc.setFontSize(10);
    doc.text(`Report Period: ${rangeLbl}`, pageW / 2, 450, { align: "center" });
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 110, 130);
  doc.text("This document is confidential and intended for internal use only.", pageW / 2, pageH - 50, { align: "center" });

  // ── PAGE 2: Executive Summary ──
  doc.addPage();
  let y = sectionHeader("Executive Summary", 55);

  const diff = prog.pct - timelinePct;
  const statusLabel = diff >= 0 ? "On Track" : diff >= -10 ? "Slightly Behind" : "Behind Schedule";

  const summaryRows = [
    ["Start Date", new Date(trainee.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
    ["Days in Program", `${days} days`],
    ["Current Phase", phaseLbl],
    ["Track", trainee.track || "Advisory"],
    ["Task Completion", `${prog.doneTasks}/${totalTasks} tasks (${prog.pct}%)`],
    ["Quizzes Passed", `${prog.passedQuizzes}/${totalQuizzes}`],
    ["Timeline Progress", `${timelinePct}%`],
    ["Timeline Status", statusLabel],
    ["Milestones", milestones.map(m => `${m.label}: ${m.unlocked ? "OK" : `${m.done}/${m.total}`}`).join("  |  ")],
  ];
  if (rangeLbl) summaryRows.push(["Report Period", rangeLbl]);

  doc.autoTable({
    startY: y,
    head: [],
    body: summaryRows,
    theme: "plain",
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 140, textColor: navy, fontSize: 10 },
      1: { textColor: gray, fontSize: 10 },
    },
    styles: { font: "helvetica", cellPadding: { top: 6, bottom: 6, left: 8, right: 8 }, lineWidth: 0 },
    alternateRowStyles: { fillColor: lightGray },
  });

  y = doc.lastAutoTable.finalY + 28;

  doc.setFontSize(12);
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.text("Overall Assessment", margin, y);
  y += 16;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  let assessment;
  if (diff >= 0) {
    assessment = `${trainee.name} is performing well and is on track to meet their ${milestoneLabel} targets. Task completion is at ${prog.pct}% with ${prog.passedQuizzes} of ${totalQuizzes} quizzes passed. Continue monitoring progress and providing feedback.`;
  } else if (diff >= -10) {
    assessment = `${trainee.name} is slightly behind schedule with ${prog.pct}% task completion against ${timelinePct}% expected timeline progress. Review the areas below for specific gaps and consider additional support or check-ins.`;
  } else {
    assessment = `${trainee.name} is significantly behind their expected progress (${prog.pct}% complete vs ${timelinePct}% expected). Immediate attention is recommended. Schedule a 1-on-1 to identify blockers and create an action plan.`;
  }
  const splitAssessment = doc.splitTextToSize(assessment, contentW);
  doc.text(splitAssessment, margin, y);

  // ── PAGE 3: KPI Performance ──
  doc.addPage();
  y = sectionHeader("KPI Performance", 55);

  ONBOARDING_KPIS.forEach((kpiDef) => {
    const allEntries = kpi[kpiDef.id] || [];
    const entries = allEntries.filter(e => inRange(e.date));
    const avg = entries.length > 0 ? entries.reduce((a, e) => a + e.score, 0) / entries.length : 0;
    const currentPhaseKey = days <= 30 ? "day30" : days <= 60 ? "day60" : "day90";
    const target = kpiDef.targets[currentPhaseKey];
    const kpiStatus = entries.length === 0 ? "No Data" : avg >= target ? "On Track" : avg >= target - 0.3 ? "At Risk" : "Behind";

    let trend = "--";
    if (entries.length >= 3) {
      const last3 = entries.slice(-3);
      const diffs = last3.slice(1).map((e, i) => e.score - last3[i].score);
      const avgDiff = diffs.reduce((a, d) => a + d, 0) / diffs.length;
      trend = avgDiff > 0.05 ? "Improving" : avgDiff < -0.05 ? "Declining" : "Stable";
    }

    doc.setFontSize(12);
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.text(kpiDef.category, margin, y);
    y += 14;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    const descLines = doc.splitTextToSize(kpiDef.description, contentW);
    doc.text(descLines, margin, y);
    y += descLines.length * 11 + 6;

    const kpiStatsRows = [
      ["Target (Current Phase)", target.toFixed(1)],
      ["Current Average", entries.length > 0 ? avg.toFixed(2) : "N/A"],
      ["Status", kpiStatus],
      ["Trend", trend],
      ["Frequency", kpiDef.frequency],
    ];

    doc.autoTable({
      startY: y,
      head: [],
      body: kpiStatsRows,
      theme: "plain",
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 160, textColor: navy, fontSize: 9 },
        1: { textColor: gray, fontSize: 9 },
      },
      styles: { font: "helvetica", cellPadding: { top: 4, bottom: 4, left: 8, right: 8 }, lineWidth: 0 },
      alternateRowStyles: { fillColor: lightGray },
    });
    y = doc.lastAutoTable.finalY + 10;

    if (entries.length > 0) {
      doc.autoTable({
        startY: y,
        head: [["Week", "Score", "Submitted By", "Comment"]],
        body: entries.map(e => [e.week, e.score.toFixed(1), e.manager, e.comment || ""]),
        theme: "grid",
        margin: { left: margin, right: margin },
        headStyles: { fillColor: blue, textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 9, textColor: navy },
        alternateRowStyles: { fillColor: lightGray },
        styles: { font: "helvetica", cellPadding: { top: 4, bottom: 4, left: 6, right: 6 } },
      });
      y = doc.lastAutoTable.finalY + 20;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...gray);
      doc.text("No scores recorded yet.", margin + 8, y + 4);
      y += 20;
    }
  });

  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.setFont("helvetica", "italic");
  doc.text("KPI data is based on weekly manager submissions and team pulse surveys.", margin, y + 8);

  // ── PAGE 4: Training Progress Detail ──
  doc.addPage();
  y = sectionHeader("Training Progress by Phase", 55);

  pMeta.forEach((pm) => {
    const phaseSections = PHASES.filter(p => pm.ids.includes(p.id));
    if (phaseSections.length === 0) return;

    doc.setFontSize(11);
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.text(pm.label, margin, y);
    y += 14;

    const rows = [];
    phaseSections.forEach(phase => {
      phase.items.forEach(item => {
        const tasksDone = item.tasks.filter(t => tasks[t.id]).length;
        const tasksTotal = item.tasks.length;
        const quizStatus = item.quiz ? (isQuizPassed(quizzes, item.id) ? "Passed" : "Not Passed") : "N/A";
        const highlight = tasksDone === 0 && days > (pm === pMeta[0] ? 0 : pm === pMeta[1] ? 30 : 60);
        rows.push([
          item.title,
          `${tasksDone}/${tasksTotal}`,
          quizStatus,
          highlight ? "No progress" : "",
        ]);
      });
    });

    doc.autoTable({
      startY: y,
      head: [["Section", "Tasks", "Quiz", "Notes"]],
      body: rows,
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: blue, textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 9, textColor: navy },
      alternateRowStyles: { fillColor: lightGray },
      styles: { font: "helvetica", cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 220 },
        1: { cellWidth: 60, halign: "center" },
        2: { cellWidth: 80, halign: "center" },
        3: { cellWidth: contentW - 360 - 24 },
      },
    });
    y = doc.lastAutoTable.finalY + 16;

    if (y > pageH - 100) {
      doc.addPage();
      y = 55;
    }
  });

  // ── PAGE 5: Manager Notes & Badges ──
  doc.addPage();
  y = sectionHeader(isTraineeReport ? "Feedback & Badges" : "Manager Observations", 55);

  doc.setFontSize(12);
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.text("Badges & Recognitions", margin, y);
  y += 16;

  if (badges.length > 0) {
    doc.autoTable({
      startY: y,
      head: [["Badge", "Awarded By", "Date"]],
      body: badges.map(b => [`${b.label}`, b.awardedBy, b.date ? new Date(b.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : ""]),
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: blue, textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 9, textColor: navy },
      alternateRowStyles: { fillColor: lightGray },
      styles: { font: "helvetica", cellPadding: { top: 5, bottom: 5, left: 8, right: 8 } },
    });
    y = doc.lastAutoTable.finalY + 20;
  } else {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text("No badges awarded yet.", margin + 8, y);
    y += 20;
  }

  doc.setFontSize(12);
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.text(isTraineeReport ? "Feedback" : "Manager Notes", margin, y);
  y += 16;

  if (notes.length > 0) {
    const sortedNotes = [...notes].sort((a, b) => new Date(a.date) - new Date(b.date));
    const noteHead = isTraineeReport ? [["Date", "Author", "Feedback", "Type"]] : [["Date", "Author", "Note", "Visibility"]];
    const noteBody = sortedNotes.map(n => [
      n.date ? new Date(n.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "",
      n.author,
      n.text,
      isTraineeReport ? (n.tag === "positive" ? "Positive" : n.tag === "improve" ? "Improve" : "General") : (n.visibility === "shared" ? "Shared" : "Internal"),
    ]);
    doc.autoTable({
      startY: y,
      head: noteHead,
      body: noteBody,
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: blue, textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 9, textColor: navy },
      alternateRowStyles: { fillColor: lightGray },
      styles: { font: "helvetica", cellPadding: { top: 5, bottom: 5, left: 6, right: 6 }, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 80 },
        2: { cellWidth: contentW - 230 },
        3: { cellWidth: 80 },
      },
    });
    y = doc.lastAutoTable.finalY + 20;
  } else {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text(isTraineeReport ? "No feedback shared yet." : "No manager notes recorded yet.", margin + 8, y);
    y += 20;
  }

  if (!isTraineeReport) {
    doc.setFontSize(12);
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.text("Areas of Focus", margin, y);
    y += 16;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);

    const focusAreas = [];
    PHASES.forEach(phase => {
      phase.items.forEach(item => {
        if (item.quiz && !isQuizPassed(quizzes, item.id)) {
          focusAreas.push(`Quiz not passed: ${item.title}`);
        }
      });
    });
    ONBOARDING_KPIS.forEach(kpiDef => {
      const entries = (kpi[kpiDef.id] || []).filter(e => inRange(e.date));
      if (entries.length > 0) {
        const avg = entries.reduce((a, e) => a + e.score, 0) / entries.length;
        const currentPhaseKey = days <= 30 ? "day30" : days <= 60 ? "day60" : "day90";
        const target = kpiDef.targets[currentPhaseKey];
        if (avg < target) {
          focusAreas.push(`${kpiDef.category}: Average ${avg.toFixed(2)} below target ${target.toFixed(1)}`);
        }
      }
    });
    if (prog.pct < timelinePct - 10) {
      focusAreas.push(`Overall progress (${prog.pct}%) significantly behind timeline (${timelinePct}%)`);
    }
    if (focusAreas.length > 0) {
      focusAreas.forEach((area) => {
        const bullet = `  -  ${area}`;
        const lines = doc.splitTextToSize(bullet, contentW - 16);
        doc.text(lines, margin + 8, y);
        y += lines.length * 13;
      });
    } else {
      doc.text("No specific areas of concern identified. Continue current trajectory.", margin + 8, y);
    }
  }

  // ── PAGE 6: AI Training Assistant Activity ──
  doc.addPage();
  y = sectionHeader("AI Training Assistant Activity", 55);

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...gray);
  doc.text("Questions asked reflect areas where the trainee sought additional guidance during onboarding.", margin, y);
  y += 18;

  // Pull chat history from localStorage
  let chatRows = [];
  try {
    const chatKey = `aiola_chats_${trainee.name}`;
    const raw = localStorage.getItem(chatKey);
    const chats = raw ? JSON.parse(raw) : [];
    chats.forEach(chat => {
      if (!chat.messages || chat.messages.length === 0) return;
      const chatDate = chat.date || (chat.messages[0]?.ts ? new Date(chat.messages[0].ts).toISOString() : null);
      if (!inRange(chatDate)) return;
      const msgCount = chat.messages.length;
      const dateDisp = chatDate ? new Date(chatDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "Unknown";
      chatRows.push([dateDisp, chat.title || "Untitled", String(msgCount)]);
    });
  } catch { /* ignore localStorage errors */ }

  if (chatRows.length > 0) {
    doc.autoTable({
      startY: y,
      head: [["Date", "Conversation Title", "Messages"]],
      body: chatRows,
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: blue, textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 9, textColor: navy },
      alternateRowStyles: { fillColor: lightGray },
      styles: { font: "helvetica", cellPadding: { top: 5, bottom: 5, left: 8, right: 8 } },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: contentW - 170 },
        2: { cellWidth: 80, halign: "center" },
      },
    });
  } else {
    doc.autoTable({
      startY: y,
      head: [["Date", "Conversation Title", "Messages"]],
      body: [["--", "No AI assistant activity recorded during this period.", "--"]],
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: blue, textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 9, textColor: gray },
      styles: { font: "helvetica", cellPadding: { top: 5, bottom: 5, left: 8, right: 8 } },
    });
  }

  // ── Add footers to all pages except cover ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i - 1, totalPages - 1);
  }

  // ── Save ──
  const dateShort = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).replace(/[\s,]+/g, "");
  const safeName = trainee.name.replace(/\s+/g, "_");
  const fileLabel = isTraineeReport ? "Progress_Report" : `${milestoneLabel.replace("-", "")}_Review`;
  doc.save(`${safeName}_${fileLabel}_${dateShort}.pdf`);
  } catch (err) {
    alert("Report generation failed: " + (err.message || String(err)));
    console.error("Report generation error:", err);
  }
}

function ReportDateModal({ title, startDate, onGenerate, onClose }) {
  const [dateFrom, setDateFrom] = useState(startDate || "");
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}>
      <div style={{background:"#fff",borderRadius:14,padding:"28px 32px",width:360,boxShadow:"0 8px 32px rgba(0,0,0,.18)",fontFamily:"'DM Sans',sans-serif"}}>
        <h3 style={{margin:"0 0 18px",fontSize:16,fontWeight:700,color:B.navy}}>{title || "Generate Milestone Report"}</h3>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:B.t3,marginBottom:4}}>From</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{width:"100%",padding:"8px 10px",border:`1px solid ${B.bdr}`,borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:B.t3,marginBottom:4}}>To</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{width:"100%",padding:"8px 10px",border:`1px solid ${B.bdr}`,borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>onGenerate(dateFrom, dateTo)} style={{flex:1,padding:"9px 18px",border:"none",borderRadius:7,background:B.blue,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Generate Report</button>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:B.t3,fontFamily:"inherit",textDecoration:"underline"}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ user, allData, onViewTrainee, onViewKpi, onGenerateReport, onLogout }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTrack, setNewTrack] = useState("Advisory");
  const [trainees, setTrainees] = useState(MOCK_TRAINEES);
  const [trackFilter, setTrackFilter] = useState("All");
  const [adminTab, setAdminTab] = useState("training");
  const [drillDown, setDrillDown] = useState(null); // {type:"deadlines"|"quizzes"|"kpi", data:[...]}
  const [aiLogTrainee, setAiLogTrainee] = useState(null);

  const handleAdd = () => {
    if(!newName.trim()||!newEmail.trim()) return;
    const id = newName.toLowerCase().replace(/\s/g,"_")+"_"+Date.now();
    const initials = newName.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
    setTrainees(p=>[...p,{id,name:newName,email:newEmail,role:"trainee",startDate:new Date().toISOString().slice(0,10),track:newTrack,avatar:initials}]);
    setNewName(""); setNewEmail(""); setNewTrack("Advisory"); setShowAdd(false);
  };

  const filteredTrainees = trackFilter === "All" ? trainees : trainees.filter(t => t.track === trackFilter);

  // Pain-point computations
  const allOverdue = trainees.flatMap(t => getOverdueTasks(t, allData[t.id]?.tasks).map(o => ({...o, trainee: t.name})));
  const allOverdueQuizzes = trainees.flatMap(t => getOverdueQuizzes(t, allData[t.id]?.quizzes).map(o => ({...o, trainee: t.name})));
  const kpiScores = trainees.map(t => {
    const prog = calcProg(allData[t.id]?.tasks, allData[t.id]?.quizzes);
    const days = daysSince(t.startDate);
    const timelinePct = Math.min(100, Math.round(days / 90 * 100));
    const kpi = timelinePct > 0 ? Math.min(100, Math.round(prog.pct / timelinePct * 100)) : 100;
    return { trainee: t.name, progressPct: prog.pct, timelinePct, kpi };
  });
  const avgKpi = kpiScores.length ? Math.round(kpiScores.reduce((a, k) => a + k.kpi, 0) / kpiScores.length) : 0;

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",background:B.bg,color:B.t1}}>
      <header className="r-header" style={{background:"#fff",borderBottom:`1px solid ${B.bdr}`,padding:"14px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <Logo size={32}/>
          <div><div className="r-header-title" style={{fontWeight:700,fontSize:15,color:B.navy}}>Aiola Portal</div><div className="r-header-sub" style={{fontSize:11,color:B.t3}}>Admin Dashboard</div></div>
        </div>
        <div className="r-header-right" style={{display:"flex",alignItems:"center",gap:16}}>
          <div className="r-hide-mobile" style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:600,color:B.t1}}>{user.name}</div><div style={{fontSize:11,color:B.t3}}>Administrator</div></div>
          <div style={{width:36,height:36,borderRadius:18,background:B.navy,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{user.avatar}</div>
          <button onClick={onLogout} className="r-touch" style={{padding:"6px 14px",border:`1px solid ${B.bdr}`,borderRadius:6,background:"#fff",cursor:"pointer",fontSize:11,color:B.t3,fontFamily:"inherit"}}>Sign Out</button>
        </div>
      </header>
      <div className="r-content" style={{padding:"28px 32px",maxWidth:1400,margin:"0 auto"}}>
        {/* Admin Tabs */}
        <div className="r-tab-row" style={{display:"flex",gap:24,marginBottom:24,borderBottom:`1px solid ${B.bdr}`}}>
          {[{key:"training",label:"Training Portal"},{key:"client",label:"Client Portal"}].map(tab=>(
            <button key={tab.key} onClick={()=>setAdminTab(tab.key)} style={{padding:"10px 4px",border:"none",borderBottom:adminTab===tab.key?`2px solid ${B.blue}`:"2px solid transparent",background:"none",cursor:"pointer",fontSize:14,fontWeight:600,color:adminTab===tab.key?B.blue:B.t3,fontFamily:"inherit",transition:"color .2s"}}>
              {tab.label}
            </button>
          ))}
        </div>
        {adminTab==="client"&&<AdminClientList />}
        {adminTab==="training"&&<>
        {/* Pain-Point Stats */}
        <div className="r-stat-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28}}>
          <div onClick={()=>setDrillDown({type:"deadlines",data:allOverdue})} style={{background:"#fff",borderRadius:12,padding:20,border:`1px solid ${allOverdue.length>0?"#fecaca":B.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)",cursor:"pointer",transition:"all .15s",borderLeft:`4px solid ${allOverdue.length>0?B.err:B.ok}`}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.04)"}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3}}>Missed Deadlines</span>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke={allOverdue.length>0?B.err:B.ok} strokeWidth="1.5"/><path d="M10 6v5l3 2" stroke={allOverdue.length>0?B.err:B.ok} strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:allOverdue.length>0?B.err:B.ok}}>{allOverdue.length}</div>
            <div style={{fontSize:10,color:B.t3,marginTop:4}}>{allOverdue.length>0?"Click to view overdue items":"All on track"}</div>
          </div>
          <div onClick={()=>setDrillDown({type:"quizzes",data:allOverdueQuizzes})} style={{background:"#fff",borderRadius:12,padding:20,border:`1px solid ${allOverdueQuizzes.length>0?"#fed7aa":B.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)",cursor:"pointer",transition:"all .15s",borderLeft:`4px solid ${allOverdueQuizzes.length>0?B.warn:B.ok}`}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.04)"}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3}}>Quizzes Overdue</span>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke={allOverdueQuizzes.length>0?B.warn:B.ok} strokeWidth="1.5"/><text x="10" y="14" textAnchor="middle" fontSize="12" fontWeight="700" fill={allOverdueQuizzes.length>0?B.warn:B.ok}>?</text></svg>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:allOverdueQuizzes.length>0?B.warn:B.ok}}>{allOverdueQuizzes.length}</div>
            <div style={{fontSize:10,color:B.t3,marginTop:4}}>{allOverdueQuizzes.length>0?"Click to view details":"All quizzes passed on time"}</div>
          </div>
          <div onClick={()=>setDrillDown({type:"kpi",data:kpiScores})} style={{background:"#fff",borderRadius:12,padding:20,border:`1px solid ${B.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)",cursor:"pointer",transition:"all .15s",borderLeft:`4px solid ${avgKpi>=80?B.ok:avgKpi>=60?B.warn:B.err}`}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,.08)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.04)"}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3}}>KPI Tracker</span>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="3" y="10" width="3" height="7" rx="1" fill={B.blue} opacity=".4"/><rect x="8.5" y="6" width="3" height="11" rx="1" fill={B.blue} opacity=".7"/><rect x="14" y="3" width="3" height="14" rx="1" fill={B.blue}/></svg>
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{fontSize:28,fontWeight:700,color:avgKpi>=80?B.ok:avgKpi>=60?B.warn:B.err}}>{avgKpi}%</span>
              <span style={{fontSize:11,color:B.t3}}>/ 100% target</span>
            </div>
            <div style={{height:5,borderRadius:3,background:B.blueL,overflow:"hidden",marginTop:8}}><div style={{height:"100%",borderRadius:3,width:`${avgKpi}%`,background:avgKpi>=80?B.ok:avgKpi>=60?B.warn:B.err,transition:"width .4s"}}/></div>
          </div>
          <div style={{background:"#fff",borderRadius:12,padding:20,border:`1px solid ${B.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)",borderLeft:`4px solid ${B.blue}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3}}>Active Trainees</span>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="3" stroke={B.blue} strokeWidth="1.5"/><circle cx="13" cy="7" r="3" stroke={B.blue} strokeWidth="1.5"/><path d="M1 17c0-3 2.5-5 6-5s6 2 6 5" stroke={B.blue} strokeWidth="1.5"/><path d="M11 17c0-3 2.5-5 6-5s4 2 4 5" stroke={B.blue} strokeWidth="1.5" opacity=".5"/></svg>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:B.blue}}>{trainees.length}</div>
            <div style={{fontSize:10,color:B.t3,marginTop:4}}>{trainees.filter(t=>daysSince(t.startDate)<=30).length} in first 30 days</div>
          </div>
        </div>

        {/* Drill-Down Modal */}
        {drillDown && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,fontFamily:"'DM Sans',sans-serif"}} onClick={()=>setDrillDown(null)}>
            <div style={{background:"#fff",borderRadius:16,padding:"28px 32px",maxWidth:640,width:"90%",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 25px 50px rgba(0,0,0,.2)"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                <h3 style={{margin:0,fontSize:18,fontWeight:700,color:B.navy}}>
                  {drillDown.type==="deadlines"?"Missed Deadlines":drillDown.type==="quizzes"?"Overdue Quizzes":"KPI Breakdown"}
                </h3>
                <button onClick={()=>setDrillDown(null)} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:B.t3,padding:4,lineHeight:1}}>×</button>
              </div>
              {drillDown.type==="deadlines"&&(drillDown.data.length===0
                ? <p style={{fontSize:13,color:B.ok,textAlign:"center",padding:20}}>No missed deadlines — all trainees are on track!</p>
                : <div style={{display:"flex",flexDirection:"column",gap:8}}>{drillDown.data.map((d,i)=>(
                    <div key={i} style={{padding:"12px 16px",border:`1px solid #fecaca`,borderRadius:8,background:"#fef2f2"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:600,color:B.err}}>{d.trainee}</span>
                        <span style={{fontSize:10,color:B.t3}}>Due by Day {d.deadline}</span>
                      </div>
                      <div style={{fontSize:12,color:B.t1}}>{d.task}</div>
                      <div style={{fontSize:10,color:B.t3,marginTop:2}}>{d.phase} · {d.item}</div>
                    </div>
                  ))}</div>
              )}
              {drillDown.type==="quizzes"&&(drillDown.data.length===0
                ? <p style={{fontSize:13,color:B.ok,textAlign:"center",padding:20}}>All quizzes passed on time!</p>
                : <div style={{display:"flex",flexDirection:"column",gap:8}}>{drillDown.data.map((d,i)=>(
                    <div key={i} style={{padding:"12px 16px",border:`1px solid #fed7aa`,borderRadius:8,background:"#fffbeb"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:600,color:B.warn}}>{d.trainee}</span>
                        <span style={{fontSize:10,color:B.t3}}>Due by Day {d.deadline}</span>
                      </div>
                      <div style={{fontSize:12,color:B.t1}}>{d.question}</div>
                      <div style={{fontSize:10,color:B.t3,marginTop:2}}>{d.phase} · {d.item}</div>
                    </div>
                  ))}</div>
              )}
              {drillDown.type==="kpi"&&(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>{drillDown.data.map((k,i)=>{
                  const kColor = k.kpi>=80?B.ok:k.kpi>=60?B.warn:B.err;
                  return(
                    <div key={i} style={{padding:"14px 16px",border:`1px solid ${B.bdr}`,borderRadius:8,background:"#fff"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <span style={{fontSize:13,fontWeight:600,color:B.t1}}>{k.trainee}</span>
                        <span style={{fontSize:14,fontWeight:700,color:kColor}}>{k.kpi}%</span>
                      </div>
                      <div style={{display:"flex",gap:16,fontSize:11,color:B.t3,marginBottom:6}}>
                        <span>Progress: {k.progressPct}%</span><span>Timeline: {k.timelinePct}%</span>
                      </div>
                      <div style={{height:5,borderRadius:3,background:B.blueL,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,width:`${k.kpi}%`,background:kColor,transition:"width .4s"}}/></div>
                    </div>
                  );
                })}</div>
              )}
            </div>
          </div>
        )}

        {/* Track Filter */}
        <div className="r-filter-row" style={{display:"flex",gap:8,marginBottom:16}}>
          {["All","Advisory","Tax Prep","Admin"].map(f=>(
            <button key={f} onClick={()=>setTrackFilter(f)} className="r-touch" style={{padding:"5px 14px",borderRadius:20,border:trackFilter===f?"none":`1px solid ${B.bdr}`,background:trackFilter===f?B.blue:"#fff",color:trackFilter===f?"#fff":B.t2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
              {f}
            </button>
          ))}
        </div>
        {/* Table */}
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${B.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)",overflow:"hidden"}}>
          <div style={{padding:"18px 24px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <h2 style={{margin:0,fontSize:16,fontWeight:700,color:B.navy}}>Team Members</h2>
            <button onClick={()=>setShowAdd(!showAdd)} className="r-touch" style={{padding:"8px 18px",border:"none",borderRadius:8,background:B.blue,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Trainee</button>
          </div>
          {showAdd && (
            <div className="r-add-form" style={{padding:"16px 24px",borderBottom:`1px solid ${B.bdr}`,background:B.blueL,display:"flex",gap:12,alignItems:"flex-end"}}>
              <div style={{flex:1}}><label style={{fontSize:11,fontWeight:600,color:B.t2,display:"block",marginBottom:4}}>Full Name</label><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. Chris Martinez" style={{width:"100%",padding:"8px 12px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/></div>
              <div style={{flex:1}}><label style={{fontSize:11,fontWeight:600,color:B.t2,display:"block",marginBottom:4}}>Email</label><input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="e.g. chris@aiolacpa.com" style={{width:"100%",padding:"8px 12px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:13,fontFamily:"inherit",boxSizing:"border-box"}}/></div>
              <div style={{flex:.7}}><label style={{fontSize:11,fontWeight:600,color:B.t2,display:"block",marginBottom:4}}>Track</label><select value={newTrack} onChange={e=>setNewTrack(e.target.value)} style={{width:"100%",padding:"8px 12px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:13,fontFamily:"inherit",boxSizing:"border-box",background:"#fff"}}><option>Advisory</option><option>Tax Prep</option><option>Admin</option></select></div>
              <button onClick={handleAdd} style={{padding:"9px 20px",border:"none",borderRadius:6,background:B.ok,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Add</button>
              <button onClick={()=>setShowAdd(false)} style={{padding:"9px 16px",border:`1px solid ${B.bdr}`,borderRadius:6,background:"#fff",color:B.t3,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
            </div>
          )}
          <div className="r-table-wrap">
          <div className="r-table-grid" style={{display:"grid",gridTemplateColumns:"2fr 0.8fr 1fr 1fr 1fr 0.7fr 210px",padding:"12px 24px",borderBottom:`1px solid ${B.bdr}`,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:B.t3}}>
            <span>Name</span><span>Phase</span><span>Start Date</span><span>Timeline</span><span>Progress</span><span>Quizzes</span><span></span>
          </div>
          {filteredTrainees.map(t=>{
            const prog=calcProg(allData[t.id]?.tasks,allData[t.id]?.quizzes);
            const days=daysSince(t.startDate);
            const timelinePct=Math.min(100,Math.round(days/90*100));
            const phaseLbl=days<=30?"Days 1–30":days<=60?"Days 31–60":"Days 61–90";
            const phaseColor=days<=30?B.blue:days<=60?B.purple:B.ok;
            const diff=timelinePct-prog.pct;
            const tlColor=diff<=0?B.ok:diff<=10?B.warn:B.err;
            return(
              <div key={t.id} className="r-table-grid" style={{display:"grid",gridTemplateColumns:"2fr 0.8fr 1fr 1fr 1fr 0.7fr 210px",padding:"14px 24px",borderBottom:`1px solid ${B.bdr}`,alignItems:"center",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:18,background:B.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{t.avatar}</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:B.t1}}>{t.name}</div><div style={{fontSize:11,color:B.t3}}>{t.email}</div></div>
                </div>
                <span style={{fontSize:11,fontWeight:600,color:phaseColor,background:days<=30?B.blueL:days<=60?B.purpleL:B.okL,padding:"3px 8px",borderRadius:6,display:"inline-block",textAlign:"center",whiteSpace:"nowrap"}}>{phaseLbl}</span>
                <span style={{fontSize:12,color:B.t2}}>{new Date(t.startDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,height:6,borderRadius:3,background:"#f1f5f9",overflow:"hidden",maxWidth:70}}><div style={{height:"100%",borderRadius:3,width:`${timelinePct}%`,background:tlColor,transition:"width .4s"}}/></div>
                  <span style={{fontSize:12,fontWeight:600,color:tlColor}}>{timelinePct}%</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,height:6,borderRadius:3,background:B.blueL,overflow:"hidden",maxWidth:70}}><div style={{height:"100%",borderRadius:3,width:`${prog.pct}%`,background:prog.pct===100?B.ok:B.blue,transition:"width .4s"}}/></div>
                  <span style={{fontSize:12,fontWeight:600,color:prog.pct===100?B.ok:B.t1}}>{prog.pct}%</span>
                </div>
                <span style={{fontSize:12,color:B.t2}}>{prog.passedQuizzes}/{totalQuizzes}</span>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>onViewTrainee(t)} style={{padding:"5px 10px",border:`1px solid ${B.blue}`,borderRadius:6,background:"#fff",color:B.blue,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>View</button>
                  <button onClick={()=>onViewKpi(t)} style={{padding:"5px 10px",border:`1px solid ${B.purple}`,borderRadius:6,background:"#fff",color:B.purple,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>KPI</button>
                  <button onClick={()=>onGenerateReport(t)} style={{padding:"5px 10px",border:`1px solid ${B.ok}`,borderRadius:6,background:"#fff",color:B.ok,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:3}}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h5.59L13 4.91V14.5H4V1.5z" stroke="currentColor" strokeWidth="1.3"/><path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.3"/><path d="M7 8v4m0 0l-2-2m2 2l2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Report
                  </button>
                  <button onClick={()=>setAiLogTrainee(t.name)} style={{padding:"5px 10px",border:`1px solid ${B.t3}`,borderRadius:6,background:"#fff",color:B.t3,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:3}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" stroke="currentColor" strokeWidth="2"/></svg>
                    AI Log
                  </button>
                  <AiQuestionCount traineeName={t.name}/>
                </div>
              </div>
            );
          })}
          </div>
        </div>
        </>}
      </div>
      {aiLogTrainee && <AiLogModal traineeName={aiLogTrainee} onClose={()=>setAiLogTrainee(null)}/>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TRAINEE PORTAL
// ═════════════════════════════════════════════════════════════════════════════

function TraineePortal({ user, completedTasks, quizResults, onToggleTask, onPassQuiz, onLogout, isAdminView, onBackToAdmin, onGenerateReport, notes, badges, onAddNote, onAddBadge, onUpdateBadge, kpiData }) {
  const [aP, setAP] = useState("week1");
  const [aI, setAI] = useState("d1");
  const [qM, setQM] = useState(null); // which item's quiz is open
  const [qIdx, setQIdx] = useState(0); // current question index
  const [qAns, setQAns] = useState({}); // {questionId: selectedIndex | freeText}
  const [qSubs, setQSubs] = useState({}); // {questionId: true} submitted
  const [qDone, setQDone] = useState(false); // showing summary
  const [sO, setSO] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  const [eP, setEP] = useState({week1:true});
  const [perfPage, setPerfPage] = useState(false);
  const mR = useRef(null);
  const prog = calcProg(completedTasks, quizResults);
  const cPh = PHASES.find(p=>p.id===aP);
  const cIt = cPh?.items.find(i=>i.id===aI)||cPh?.items[0];
  const milestones = getMilestoneStatus(completedTasks);
  const days = daysSince(user.startDate);
  const currentPhaseIdx = days <= 30 ? 0 : days <= 60 ? 1 : 2;
  const phaseEnd = [30, 60, 90][currentPhaseIdx];
  const daysRemaining = Math.max(0, phaseEnd - days);

  const sel = (pid,iid) => { setPerfPage(false); setAP(pid); setAI(iid); setEP(p=>({...p,[pid]:true})); setQM(null); setQIdx(0); setQAns({}); setQSubs({}); setQDone(false); if(mR.current)mR.current.scrollTop=0; };
  const goPerf = () => { setPerfPage(true); if(mR.current)mR.current.scrollTop=0; };
  const resetQuiz = () => { setQM(null); setQIdx(0); setQAns({}); setQSubs({}); setQDone(false); };

  // KPI averages for snapshot
  const kpi = kpiData || {};
  const commEntries = kpi.communication || [];
  const teamEntries = kpi.teamwork || [];
  const commAvg = commEntries.length > 0 ? commEntries.reduce((a,e)=>a+e.score,0)/commEntries.length : 0;
  const teamAvg = teamEntries.length > 0 ? teamEntries.reduce((a,e)=>a+e.score,0)/teamEntries.length : 0;

  // Shared notes for trainee view
  const sharedNotes = (notes || []).filter(n => n.visibility === "shared");

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",display:"flex",height:"100vh",width:"100%",background:B.bg,color:B.t1,overflow:"hidden"}}>
      <style>{`@keyframes milestoneGlow{0%,100%{filter:drop-shadow(0 0 4px currentColor) brightness(1)}50%{filter:drop-shadow(0 0 10px currentColor) brightness(1.15)}}`}</style>
      {sO && <div className="r-sidebar-overlay" onClick={()=>setSO(false)}/>}
      <aside className={sO?"r-trainee-sidebar":""} style={{width:sO?240:0,minWidth:sO?240:0,background:"#fff",borderRight:`1px solid ${B.bdr}`,display:"flex",flexDirection:"column",overflow:"hidden",transition:"width .3s,min-width .3s"}}>
        <div style={{padding:"18px 20px 14px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:10}}>
          <Logo size={30}/><div><div style={{fontWeight:700,fontSize:13,color:B.navy,letterSpacing:.5}}>AIOLA CPA, PLLC</div><div style={{fontSize:10,color:B.t3,marginTop:1}}>Training Portal</div></div>
        </div>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:16,background:B.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{user.avatar}</div>
          <div><div style={{fontSize:12,fontWeight:600,color:B.t1}}>{user.name}</div><div style={{fontSize:10,color:B.t3}}>{user.track||"Advisory"} Track</div></div>
        </div>
        {/* Progress Summary Card */}
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${B.bdr}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3}}>Overall</span>
            <span style={{fontSize:12,fontWeight:700,color:prog.pct===100?B.ok:B.blue}}>{prog.pct}%</span>
          </div>
          <div style={{height:5,borderRadius:3,background:B.blueL,overflow:"hidden"}}><div style={{height:"100%",width:`${prog.pct}%`,borderRadius:3,background:prog.pct===100?B.ok:`linear-gradient(90deg,${B.blue},${B.blueD})`,transition:"width .5s"}}/></div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:B.t3}}><span>{prog.doneTasks}/{totalTasks} tasks</span><span>{prog.passedQuizzes}/{totalQuizzes} quizzes</span></div>
          {/* Phase indicator + days remaining */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10}}>
            <span style={{fontSize:10,fontWeight:600,color:pMeta[currentPhaseIdx].color,background:currentPhaseIdx===0?B.blueL:currentPhaseIdx===1?B.purpleL:B.okL,padding:"2px 8px",borderRadius:6}}>{pMeta[currentPhaseIdx].label}</span>
            <span style={{fontSize:10,color:B.t3}}>{daysRemaining > 0 ? `${daysRemaining}d remaining` : "Phase complete"}</span>
          </div>
          {/* Milestone trophies inline */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginTop:10,padding:"6px 0"}}>
            {milestones.map(m => (
              <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}} title={m.unlocked?`${m.label} — Unlocked!`:m.label}>
                <div style={m.unlocked?{animation:"milestoneGlow 2s ease-in-out infinite"}:{}}>
                  <TrophySvg size={20} color={m.unlocked ? m.color : "#d1d5db"} glow={m.unlocked}/>
                </div>
                <span style={{fontSize:8,fontWeight:600,color:m.unlocked?m.color:B.t3}}>{m.done}/{m.total}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Recent Feedback — truncated, links to My Performance */}
        {!isAdminView && sharedNotes.length > 0 && (
          <div style={{padding:"12px 20px",borderBottom:`1px solid ${B.bdr}`}}>
            <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:B.t3,marginBottom:8}}>Recent Feedback</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {sharedNotes.slice(0,2).map(n => (
                <div key={n.id} style={{padding:"6px 8px",background:"#fafbfc",borderRadius:6,borderLeft:`3px solid ${n.tag==="positive"?"#22c55e":n.tag==="improve"?B.err:B.blue}`}}>
                  <div style={{fontSize:11,color:B.t1,lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.text}</div>
                  <div style={{fontSize:9,color:B.t3,marginTop:2}}>{n.author} · {new Date(n.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                </div>
              ))}
              <button onClick={goPerf} style={{border:"none",background:"none",color:B.blue,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",padding:"4px 0",textAlign:"left"}}>→ See all feedback on My Performance</button>
            </div>
          </div>
        )}
        <nav style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
          {pMeta.map(meta=>(
            <div key={meta.label}>
              <div style={{padding:"8px 20px 3px",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:meta.color,opacity:.7}}>{meta.label}</div>
              {PHASES.filter(p=>meta.ids.includes(p.id)).map(phase=>{
                const pp=phaseProg(phase,completedTasks); const isE=eP[phase.id];
                return(
                  <div key={phase.id}>
                    <button onClick={()=>{setEP(p=>({...p,[phase.id]:!p[phase.id]}));if(!isE)sel(phase.id,phase.items[0].id);}}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"6px 20px",border:"none",background:"none",cursor:"pointer",fontSize:12,fontWeight:600,color:aP===phase.id&&!perfPage?B.blue:B.t1,fontFamily:"inherit",textAlign:"left"}}>
                      <Chev open={isE}/><span style={{flex:1}}>{phase.label}</span>
                      {pp===100?<span style={{width:16,height:16,borderRadius:8,background:B.ok,display:"flex",alignItems:"center",justifyContent:"center"}}><Chk/></span>:<span style={{fontSize:10,color:B.t3}}>{pp}%</span>}
                    </button>
                    {isE&&<div style={{paddingLeft:36}}>{phase.items.map(item=>{
                      const ip=itemProg(item,completedTasks); const isA=aI===item.id&&aP===phase.id&&!perfPage;
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
          {/* My Performance nav item */}
          {!isAdminView && (
            <>
              <div style={{margin:"6px 20px",borderTop:`1px solid ${B.bdr}`}}/>
              <button onClick={goPerf}
                style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 20px",border:"none",background:perfPage?B.blueL:"none",cursor:"pointer",fontSize:12,fontWeight:perfPage?700:600,color:perfPage?B.blue:B.t1,fontFamily:"inherit",textAlign:"left",transition:"background .15s"}}>
                <span style={{fontSize:14}}>📊</span><span>My Performance</span>
              </button>
            </>
          )}
        </nav>
      </aside>
      <main ref={mR} style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <header className="r-trainee-main-header" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 28px",background:"#fff",borderBottom:`1px solid ${B.bdr}`,position:"sticky",top:0,zIndex:10}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button onClick={()=>setSO(!sO)} style={{border:"none",background:"none",cursor:"pointer",padding:4,display:"flex"}}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><line x1="3" y1="5" x2="17" y2="5" stroke={B.t2} strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="17" y2="10" stroke={B.t2} strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="15" x2="17" y2="15" stroke={B.t2} strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <div><h1 style={{margin:0,fontSize:16,fontWeight:700,color:B.navy}}>{perfPage?"My Performance":cIt?.title||"Training"}</h1><p style={{margin:0,fontSize:11,color:B.t3,marginTop:1}}>{perfPage?"KPIs, achievements & feedback":cPh?.subtitle+" · "+cPh?.phase}</p></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            {isAdminView&&<button onClick={onBackToAdmin} style={{padding:"6px 14px",border:`1px solid ${B.blue}`,borderRadius:6,background:"#fff",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← Back to Admin</button>}
            {isAdminView&&onGenerateReport&&<button onClick={onGenerateReport} style={{padding:"6px 14px",border:"none",borderRadius:6,background:B.ok,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h5.59L13 4.91V14.5H4V1.5z" stroke="#fff" strokeWidth="1.3"/><path d="M9.5 1.5V5H13" stroke="#fff" strokeWidth="1.3"/><path d="M7 8v4m0 0l-2-2m2 2l2-2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Generate Report
            </button>}
            <div style={{display:"flex",alignItems:"center",gap:6}}><Ring pct={prog.pct} size={32} stroke={3}/><div style={{fontSize:13,fontWeight:700,color:prog.pct===100?B.ok:B.navy}}>{prog.pct}%</div></div>
            {!isAdminView&&<button onClick={onLogout} style={{padding:"6px 12px",border:`1px solid ${B.bdr}`,borderRadius:6,background:"#fff",cursor:"pointer",fontSize:11,color:B.t3,fontFamily:"inherit"}}>Sign Out</button>}
          </div>
        </header>
        {/* My Performance Page */}
        {perfPage && (
          <div className="r-trainee-content" style={{padding:"24px 28px",maxWidth:960,width:"100%"}}>
            {/* Generate My Report button — trainee only */}
            {!isAdminView && onGenerateReport && (
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
                <button onClick={onGenerateReport} style={{padding:"8px 18px",border:"none",borderRadius:8,background:B.blue,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h5.59L13 4.91V14.5H4V1.5z" stroke="#fff" strokeWidth="1.3"/><path d="M9.5 1.5V5H13" stroke="#fff" strokeWidth="1.3"/><path d="M7 8v4m0 0l-2-2m2 2l2-2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Generate My Report
                </button>
              </div>
            )}
            {/* KPI Snapshot */}
            <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`}}><span style={{fontSize:12,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>KPI Snapshot</span></div>
              <div style={{padding:"18px 18px"}}>
                {(commEntries.length > 0 || teamEntries.length > 0) ? (
                  <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                    {commEntries.length > 0 && (()=>{
                      const latest = commEntries[commEntries.length-1];
                      const prev = commEntries.length > 1 ? commEntries[commEntries.length-2] : null;
                      const trend = prev ? latest.score - prev.score : 0;
                      const phase = latest.phase || (latest.week <= 4 ? "day30" : latest.week <= 8 ? "day60" : "day90");
                      const target = ONBOARDING_KPIS.find(k=>k.id==="communication")?.targets?.[phase] || 3;
                      const onTrack = commAvg >= target;
                      return (
                        <div style={{flex:"1 1 200px",padding:16,background:B.blueL,borderRadius:10,border:`1px solid ${B.blueM}`}}>
                          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:B.t3,marginBottom:10}}>Communication</div>
                          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                            <Ring pct={Math.round(commAvg/5*100)} size={48} stroke={4}/>
                            <div>
                              <div style={{fontSize:22,fontWeight:800,color:B.navy}}>{commAvg.toFixed(1)}<span style={{fontSize:12,fontWeight:400,color:B.t3}}>/5</span></div>
                              {trend !== 0 && <div style={{fontSize:11,fontWeight:600,color:trend>0?B.ok:B.err}}>{trend>0?"▲":"▼"} {Math.abs(trend).toFixed(1)} from last</div>}
                            </div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:10,color:B.t3}}>Target: {target.toFixed(1)}</span>
                            <span style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:4,background:onTrack?B.okL:"#fee2e2",color:onTrack?B.ok:B.err}}>{onTrack?"On Track":"Below Target"}</span>
                          </div>
                        </div>
                      );
                    })()}
                    {teamEntries.length > 0 && (()=>{
                      const latest = teamEntries[teamEntries.length-1];
                      const prev = teamEntries.length > 1 ? teamEntries[teamEntries.length-2] : null;
                      const trend = prev ? latest.score - prev.score : 0;
                      const phase = latest.phase || (latest.week <= 4 ? "day30" : latest.week <= 8 ? "day60" : "day90");
                      const target = ONBOARDING_KPIS.find(k=>k.id==="teamwork")?.targets?.[phase] || 3;
                      const onTrack = teamAvg >= target;
                      return (
                        <div style={{flex:"1 1 200px",padding:16,background:"#faf5ff",borderRadius:10,border:`1px solid #e9d5ff`}}>
                          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:B.t3,marginBottom:10}}>Teamwork</div>
                          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                            <Ring pct={Math.round(teamAvg/5*100)} size={48} stroke={4}/>
                            <div>
                              <div style={{fontSize:22,fontWeight:800,color:B.navy}}>{teamAvg.toFixed(1)}<span style={{fontSize:12,fontWeight:400,color:B.t3}}>/5</span></div>
                              {trend !== 0 && <div style={{fontSize:11,fontWeight:600,color:trend>0?B.ok:B.err}}>{trend>0?"▲":"▼"} {Math.abs(trend).toFixed(1)} from last</div>}
                            </div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:10,color:B.t3}}>Target: {target.toFixed(1)}</span>
                            <span style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:4,background:onTrack?B.okL:"#fee2e2",color:onTrack?B.ok:B.err}}>{onTrack?"On Track":"Below Target"}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{fontSize:12,color:B.t3,textAlign:"center",padding:"12px 0"}}>No KPI scores recorded yet. Your manager will add scores as you progress.</div>
                )}
              </div>
            </div>

            {/* Achievements & Milestones */}
            <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`}}><span style={{fontSize:12,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Achievements & Milestones</span></div>
              <div style={{padding:"18px 18px"}}>
                {/* Milestone trophies */}
                <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
                  {milestones.map(m => (
                    <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:10,background:m.unlocked?"#fffbeb":"#f9fafb",border:`1px solid ${m.unlocked?"#fde68a":B.bdr}`}}>
                      <div style={m.unlocked?{animation:"milestoneGlow 2s ease-in-out infinite"}:{}}>
                        <TrophySvg size={24} color={m.unlocked ? m.color : "#d1d5db"} glow={m.unlocked}/>
                      </div>
                      <div>
                        <div style={{fontSize:11,fontWeight:600,color:m.unlocked?B.t1:B.t3}}>{m.label}</div>
                        <div style={{fontSize:10,color:m.unlocked?m.color:B.t3}}>{m.done}/{m.total} {m.unlocked?"✓":""}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Badges */}
                {(()=>{
                  const activeBadges = (badges||[]).filter(b => !b.removed);
                  return activeBadges.length > 0 ? (
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {activeBadges.map(b => {
                        const iconFn = BADGE_ICONS[b.badgeId];
                        const awardDate = b.date ? new Date(b.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : null;
                        return (
                          <div key={b.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:B.blueL,borderRadius:10,border:`1px solid ${B.blueM}`}}>
                            <div style={{width:32,height:32,borderRadius:16,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1px solid ${B.blueM}`}}>
                              {iconFn ? iconFn(18, B.blue) : <span style={{fontSize:16}}>{b.icon}</span>}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:600,color:B.t1}}>{b.label}</div>
                              <div style={{fontSize:10,color:B.t3}}>{b.awardedBy}{awardDate ? ` · Awarded ${awardDate}` : ""}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{fontSize:12,color:B.t3}}>No badges awarded yet. Keep up the great work!</div>
                  );
                })()}
              </div>
            </div>

            {/* Feedback from Your Manager — full two-column view */}
            <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden"}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`}}><span style={{fontSize:12,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Feedback from Your Manager</span></div>
              {(()=>{
                const positiveNotes = sharedNotes.filter(n => n.tag === "positive");
                const improveNotes = sharedNotes.filter(n => n.tag === "improve");
                return sharedNotes.length > 0 ? (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                    <div style={{borderRight:`1px solid ${B.bdr}`,padding:"14px 18px"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#22c55e",marginBottom:12}}>✅ What's Going Well</div>
                      {positiveNotes.length === 0 ? (
                        <div style={{fontSize:12,color:B.t3,fontStyle:"italic"}}>Nothing here yet.</div>
                      ) : positiveNotes.map(note => (
                        <div key={note.id} style={{padding:"8px 0",borderBottom:`1px solid #f1f5f9`}}>
                          <div style={{fontSize:10,color:B.t3,marginBottom:2}}>{note.author} · {new Date(note.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                          <div style={{fontSize:13,color:B.t1,lineHeight:1.5}}>{note.text}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:"14px 18px"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",marginBottom:12}}>📈 Areas to Improve</div>
                      {improveNotes.length === 0 ? (
                        <div style={{fontSize:12,color:B.t3,fontStyle:"italic"}}>Nothing here yet.</div>
                      ) : improveNotes.map(note => (
                        <div key={note.id} style={{padding:"8px 0",borderBottom:`1px solid #f1f5f9`}}>
                          <div style={{fontSize:10,color:B.t3,marginBottom:2}}>{note.author} · {new Date(note.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                          <div style={{fontSize:13,color:B.t1,lineHeight:1.5}}>{note.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{padding:"24px 18px",textAlign:"center",fontSize:12,color:B.t3}}>No feedback shared yet. Your manager will share feedback as you progress through training.</div>
                );
              })()}
            </div>
          </div>
        )}
        {/* Section content */}
        {!perfPage&&cIt&&(
          <div className="r-trainee-content" style={{padding:"24px 28px",maxWidth:960,width:"100%"}}>
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
            {/* Videos */}
            {cIt.videos?.length>0&&(
              <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
                <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:6}}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 2.5v11l10-5.5L3 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                  <span style={{fontSize:12,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Videos</span>
                </div>
                <div style={{padding:18,display:"grid",gridTemplateColumns:cIt.videos.length>1?"repeat(auto-fit,minmax(260px,1fr))":"1fr",gap:16}}>
                  {cIt.videos.map((v,i)=>(
                    <div key={i} style={{maxWidth:560}}>
                      <div style={{position:"relative",paddingBottom:"56.25%",height:0,overflow:"hidden",borderRadius:8,border:`1px solid ${B.bdr}`}}>
                        <iframe src={`https://www.youtube.com/embed/${v.embedId}`} title={v.label} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
                      </div>
                      <p style={{margin:"8px 0 0",fontSize:12,fontWeight:600,color:B.t1}}>{v.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Quiz */}
            {cIt.quiz&&(()=>{
              const nQuiz = normalizeQuiz(cIt.quiz);
              const qs = nQuiz.questions;
              const savedResult = quizResults?.[cIt.id];
              const completed = savedResult === true || (savedResult && typeof savedResult === "object");
              const passed = isQuizPassed(quizResults, cIt.id);
              const savedQuestions = (typeof savedResult === "object" && savedResult?.questions) || null;
              const curQ = qs[qIdx];
              const isSub = !!qSubs[curQ?.id];
              const mcQuestions = qs.filter(q=>q.type==="multiple_choice");
              const mcCorrectCount = mcQuestions.filter(q=>qAns[q.id]===q.correct).length;
              const allMcCorrect = mcQuestions.length>0 ? mcCorrectCount===mcQuestions.length : true;

              // Finish quiz: always mark complete (no retry)
              const finishQuiz = () => {
                const qResults = {};
                for(const q of qs){
                  if(q.type==="multiple_choice") qResults[q.id]={type:"multiple_choice",answer:qAns[q.id],correct:qAns[q.id]===q.correct,attempts:1};
                  else qResults[q.id]={type:"free_text",answer:qAns[q.id]||"",status:"pending_review"};
                }
                onPassQuiz(cIt.id, {passed:allMcCorrect, questions:qResults});
                setQDone(true);
              };

              // Read-only results renderer (used by admin view and completed state)
              const renderResults = (qsData, resultsMap) => (
                <div style={{padding:18}}>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {qsData.map((q,i)=>{
                      const r = resultsMap?.[q.id];
                      const isMc = q.type==="multiple_choice";
                      const isFt = q.type==="free_text";
                      const traineeAnswer = r ? r.answer : null;
                      const isCorrect = isMc && r?.correct;
                      return(
                        <div key={q.id} style={{padding:"12px 14px",borderRadius:8,border:`1px solid ${B.bdr}`,background:"#fff"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                            <span style={{fontSize:10,fontWeight:700,color:B.t3}}>Q{i+1}</span>
                            {isMc && isCorrect && <span style={{fontSize:10,fontWeight:600,color:B.ok,background:B.okL,padding:"2px 8px",borderRadius:10}}>✓ Correct</span>}
                            {isMc && !isCorrect && <span style={{fontSize:10,fontWeight:600,color:B.err,background:"#fee2e2",padding:"2px 8px",borderRadius:10}}>✗ Incorrect</span>}
                            {isFt && <span style={{fontSize:10,fontWeight:600,color:B.blue,background:B.blueL,padding:"2px 8px",borderRadius:10}}>Answer Submitted</span>}
                          </div>
                          <div style={{fontSize:12,fontWeight:600,color:B.navy,marginBottom:8,lineHeight:1.5}}>{q.question}</div>
                          {isMc && (
                            <div style={{display:"flex",flexDirection:"column",gap:4}}>
                              {q.options.map((opt,idx)=>{
                                const isTraineeChoice = traineeAnswer === idx;
                                const isCorrectOpt = idx === q.correct;
                                let bg = "#fff", bd = B.bdr, cl = B.t2;
                                if (isCorrectOpt) { bg = B.okBg; bd = B.ok; cl = B.ok; }
                                if (isTraineeChoice && !isCorrectOpt) { bg = "#fef2f2"; bd = B.err; cl = B.err; }
                                if (isTraineeChoice && isCorrectOpt) { bg = B.okBg; bd = B.ok; cl = B.ok; }
                                return (
                                  <div key={idx} style={{padding:"8px 12px",border:`1.5px solid ${bd}`,borderRadius:6,background:bg,fontSize:11,color:cl,display:"flex",alignItems:"center",gap:8}}>
                                    {isTraineeChoice && <span style={{fontSize:9,fontWeight:700,color:isCorrectOpt?B.ok:B.err,background:isCorrectOpt?B.okL:"#fee2e2",padding:"1px 6px",borderRadius:4,flexShrink:0}}>Your answer</span>}
                                    {isCorrectOpt && !isTraineeChoice && <span style={{fontSize:9,fontWeight:700,color:B.ok,background:B.okL,padding:"1px 6px",borderRadius:4,flexShrink:0}}>Correct</span>}
                                    <span>{opt}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {isFt && (
                            <>
                              <div style={{padding:"8px 12px",border:`1.5px solid ${B.blue}`,borderRadius:6,background:B.blueL,fontSize:11,color:B.t1,marginBottom:6,lineHeight:1.5}}>
                                <span style={{fontSize:9,fontWeight:700,color:B.blue,display:"block",marginBottom:2}}>Trainee's Answer:</span>
                                {r?.answer || <span style={{color:B.t3,fontStyle:"italic"}}>No answer provided</span>}
                              </div>
                              {q.modelAnswer && (
                                <div style={{padding:"8px 12px",border:`1.5px solid ${B.ok}`,borderRadius:6,background:B.okBg,fontSize:11,color:B.t1,lineHeight:1.5}}>
                                  <span style={{fontSize:9,fontWeight:700,color:B.ok,display:"block",marginBottom:2}}>Model Answer:</span>
                                  {q.modelAnswer}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );

              // ADMIN VIEW: read-only results panel
              if (isAdminView) {
                return (
                  <div style={{background:B.card,border:`1px solid ${completed?B.ok:B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
                    <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:completed?B.okBg:"transparent"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>{completed?<Trophy/>:<QuizIc/>}<span style={{fontSize:12,fontWeight:700,color:completed?B.ok:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Quiz Results</span></div>
                      <span style={{fontSize:10,fontWeight:600,color:B.t3,background:"#f1f5f9",padding:"2px 8px",borderRadius:10}}>Read Only</span>
                    </div>
                    {!completed ? (
                      <div style={{padding:"24px 18px",textAlign:"center"}}>
                        <div style={{color:B.t3,marginBottom:6}}><QuizIc/></div>
                        <div style={{fontSize:13,color:B.t3}}>Not yet attempted</div>
                      </div>
                    ) : (
                      renderResults(qs, savedQuestions)
                    )}
                  </div>
                );
              }

              // TRAINEE VIEW: completed quiz — show permanent results
              if (completed) {
                return (
                  <div style={{background:B.card,border:`1px solid ${passed?B.ok:B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
                    <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:passed?B.okBg:"transparent"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>{passed?<Trophy/>:<QuizIc/>}<span style={{fontSize:12,fontWeight:700,color:passed?B.ok:B.navy,textTransform:"uppercase",letterSpacing:.8}}>{passed?"Quiz Passed":"Quiz Complete"}</span></div>
                      <span style={{fontSize:10,fontWeight:600,color:B.ok,background:B.okL,padding:"2px 8px",borderRadius:10}}>✓ Submitted</span>
                    </div>
                    {savedQuestions ? renderResults(qs, savedQuestions) : (
                      <div style={{padding:"16px 18px",color:B.t2,fontSize:12}}>Quiz completed. ({qs.length} question{qs.length!==1?"s":""})</div>
                    )}
                  </div>
                );
              }

              return(
              <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
                <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><QuizIc/><span style={{fontSize:12,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Knowledge Check</span></div>
                  {qM===cIt.id&&!qDone&&<span style={{fontSize:10,color:B.t3}}>Question {qIdx+1} of {qs.length}</span>}
                </div>
                {qDone?(
                  /* Summary screen after finishing — permanent results */
                  <div style={{padding:18}}>
                    <div style={{textAlign:"center",padding:"10px 0 16px"}}>
                      <div style={{fontSize:18,fontWeight:700,color:allMcCorrect?B.ok:B.navy,marginBottom:4}}>
                        {allMcCorrect?"All correct!":"Quiz Complete"}
                      </div>
                      <div style={{fontSize:13,color:B.t2}}>
                        You got {mcCorrectCount} out of {mcQuestions.length} multiple choice correct
                        {qs.length>mcQuestions.length&&<span> · {qs.length-mcQuestions.length} free-text submitted for review</span>}
                      </div>
                    </div>
                    {/* Per-question detailed results */}
                    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
                      {qs.map((q,i)=>{
                        const isMc = q.type==="multiple_choice";
                        const isFt = q.type==="free_text";
                        const isCorrect = isMc&&qAns[q.id]===q.correct;
                        return(
                          <div key={q.id} style={{padding:"12px 14px",borderRadius:8,border:`1px solid ${B.bdr}`,background:"#fff"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                              <span style={{fontSize:10,fontWeight:700,color:B.t3}}>Q{i+1}</span>
                              {isMc && isCorrect && <span style={{fontSize:10,fontWeight:600,color:B.ok,background:B.okL,padding:"2px 8px",borderRadius:10}}>✓ Correct</span>}
                              {isMc && !isCorrect && <span style={{fontSize:10,fontWeight:600,color:B.err,background:"#fee2e2",padding:"2px 8px",borderRadius:10}}>✗ Incorrect</span>}
                              {isFt && <span style={{fontSize:10,fontWeight:600,color:B.blue,background:B.blueL,padding:"2px 8px",borderRadius:10}}>Answer Submitted</span>}
                            </div>
                            <div style={{fontSize:12,fontWeight:600,color:B.navy,marginBottom:8,lineHeight:1.5}}>{q.question}</div>
                            {isMc && (
                              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                {q.options.map((opt,idx)=>{
                                  const isTraineeChoice = qAns[q.id] === idx;
                                  const isCorrectOpt = idx === q.correct;
                                  let bg = "#fff", bd = B.bdr, cl = B.t2;
                                  if (isCorrectOpt) { bg = B.okBg; bd = B.ok; cl = B.ok; }
                                  if (isTraineeChoice && !isCorrectOpt) { bg = "#fef2f2"; bd = B.err; cl = B.err; }
                                  if (isTraineeChoice && isCorrectOpt) { bg = B.okBg; bd = B.ok; cl = B.ok; }
                                  return (
                                    <div key={idx} style={{padding:"8px 12px",border:`1.5px solid ${bd}`,borderRadius:6,background:bg,fontSize:11,color:cl,display:"flex",alignItems:"center",gap:8}}>
                                      {isTraineeChoice && <span style={{fontSize:9,fontWeight:700,color:isCorrectOpt?B.ok:B.err,background:isCorrectOpt?B.okL:"#fee2e2",padding:"1px 6px",borderRadius:4,flexShrink:0}}>Your answer</span>}
                                      {isCorrectOpt && !isTraineeChoice && <span style={{fontSize:9,fontWeight:700,color:B.ok,background:B.okL,padding:"1px 6px",borderRadius:4,flexShrink:0}}>Correct</span>}
                                      <span>{opt}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {isFt && (
                              <>
                                <div style={{padding:"8px 12px",border:`1.5px solid ${B.blue}`,borderRadius:6,background:B.blueL,fontSize:11,color:B.t1,marginBottom:6,lineHeight:1.5}}>
                                  <span style={{fontSize:9,fontWeight:700,color:B.blue,display:"block",marginBottom:2}}>Your Answer:</span>
                                  {qAns[q.id] || <span style={{color:B.t3,fontStyle:"italic"}}>No answer</span>}
                                </div>
                                {q.modelAnswer && (
                                  <div style={{padding:"8px 12px",border:`1.5px solid ${B.ok}`,borderRadius:6,background:B.okBg,fontSize:11,color:B.t1,lineHeight:1.5}}>
                                    <span style={{fontSize:9,fontWeight:700,color:B.ok,display:"block",marginBottom:2}}>Model Answer:</span>
                                    {q.modelAnswer}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={resetQuiz} style={{padding:"8px 16px",border:`1px solid ${B.bdr}`,borderRadius:7,background:"#fff",color:B.t3,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Close</button>
                  </div>
                ):qM===cIt.id&&curQ?(
                  /* Active question */
                  <div style={{padding:18}}>
                    {/* Progress dots */}
                    <div style={{display:"flex",gap:4,marginBottom:14}}>
                      {qs.map((_,i)=>(
                        <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<qIdx?B.ok:i===qIdx?B.blue:B.bdr,transition:"background .3s"}}/>
                      ))}
                    </div>
                    <div style={{fontSize:10,fontWeight:600,color:B.t3,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>
                      {curQ.type==="multiple_choice"?"Multiple Choice":"Free Response"}
                    </div>
                    <p style={{fontSize:13,fontWeight:600,color:B.navy,lineHeight:1.5,marginTop:0,marginBottom:14}}>{curQ.question}</p>

                    {curQ.type==="multiple_choice"&&(
                      <>
                        {curQ.options.map((opt,idx)=>{
                          const isSel=qAns[curQ.id]===idx,isCor=idx===curQ.correct;
                          let bg="#fff",bd=B.bdr,cl=B.t1;
                          if(isSub){if(isCor){bg=B.okBg;bd=B.ok;cl=B.ok}else if(isSel&&!isCor){bg="#fef2f2";bd=B.err;cl=B.err}}
                          else if(isSel){bg=B.blueL;bd=B.blue;cl=B.blue}
                          return <div key={idx} onClick={()=>{if(!isSub)setQAns(p=>({...p,[curQ.id]:idx}))}} style={{padding:"10px 14px",border:`2px solid ${bd}`,borderRadius:7,marginBottom:6,cursor:isSub?"default":"pointer",background:bg,color:cl,fontSize:12,fontWeight:isSel?600:400,transition:"all .2s",display:"flex",alignItems:"center",gap:10}}>
                            <span style={{width:20,height:20,borderRadius:10,flexShrink:0,border:`2px solid ${isSel?bd:B.bdr}`,background:isSel?(isSub?(isCor?B.ok:B.err):B.blue):"#fff",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{isSel&&<div style={{width:6,height:6,borderRadius:3,background:"#fff"}}/>}</span>{opt}
                          </div>;
                        })}
                      </>
                    )}

                    {curQ.type==="free_text"&&(
                      <>
                        <textarea value={qAns[curQ.id]||""} onChange={e=>{if(!isSub)setQAns(p=>({...p,[curQ.id]:e.target.value}))}} placeholder="Type your answer here..." rows={4}
                          style={{width:"100%",padding:"10px 14px",border:`1px solid ${isSub?B.ok:B.bdr}`,borderRadius:7,fontSize:12,fontFamily:"'DM Sans',sans-serif",color:B.t1,resize:"vertical",outline:"none",boxSizing:"border-box",background:isSub?"#fafbfc":"#fff",transition:"border-color .2s"}}
                          onFocus={e=>{if(!isSub)e.target.style.borderColor=B.blue}} onBlur={e=>{e.target.style.borderColor=isSub?B.ok:B.bdr}} readOnly={isSub}/>
                        {isSub&&curQ.modelAnswer&&(
                          <div style={{marginTop:10,padding:"12px 14px",border:`1px solid ${B.blueM}`,borderRadius:7,background:B.blueL}}>
                            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:B.blue,marginBottom:4}}>Model Answer</div>
                            <div style={{fontSize:12,color:B.t1,lineHeight:1.6}}>{curQ.modelAnswer}</div>
                          </div>
                        )}
                        {isSub&&<div style={{marginTop:8,fontSize:11,color:B.blue,fontWeight:500,display:"flex",alignItems:"center",gap:4}}>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke={B.blue} strokeWidth="1.3"/><path d="M8 5v3M8 10v.5" stroke={B.blue} strokeWidth="1.5" strokeLinecap="round"/></svg>
                          Your response has been submitted for manager review.
                        </div>}
                      </>
                    )}

                    <div style={{display:"flex",gap:6,marginTop:14,alignItems:"center"}}>
                      {!isSub?(
                        <button disabled={qAns[curQ.id]==null||(curQ.type==="free_text"&&!(qAns[curQ.id]||"").trim())} onClick={()=>setQSubs(p=>({...p,[curQ.id]:true}))}
                          style={{padding:"8px 20px",border:"none",borderRadius:7,background:(qAns[curQ.id]!=null&&(curQ.type!=="free_text"||(qAns[curQ.id]||"").trim()))?B.blue:B.bdr,color:"#fff",fontSize:12,fontWeight:600,cursor:(qAns[curQ.id]!=null&&(curQ.type!=="free_text"||(qAns[curQ.id]||"").trim()))?"pointer":"default",fontFamily:"inherit"}}>Submit</button>
                      ):(
                        <>
                          {qIdx<qs.length-1?(
                            <button onClick={()=>setQIdx(i=>i+1)} style={{padding:"8px 20px",border:"none",borderRadius:7,background:B.blue,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Next Question →</button>
                          ):(
                            <button onClick={finishQuiz} style={{padding:"8px 20px",border:"none",borderRadius:7,background:B.ok,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Finish Quiz</button>
                          )}
                        </>
                      )}
                      <button onClick={resetQuiz} style={{padding:"8px 16px",border:`1px solid ${B.bdr}`,borderRadius:7,background:"#fff",color:B.t3,fontSize:12,cursor:"pointer",fontFamily:"inherit",marginLeft:"auto"}}>Close</button>
                    </div>
                  </div>
                ):(
                  <div style={{padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <p style={{margin:0,fontSize:12,color:B.t2}}>Test your knowledge before moving on. ({qs.length} question{qs.length!==1?"s":""})</p>
                    <button onClick={()=>{setQIdx(0);setQAns({});setQSubs({});setQDone(false);setQM(cIt.id)}} style={{padding:"7px 16px",border:"none",borderRadius:7,background:B.blue,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Start Quiz</button>
                  </div>
                )}
              </div>
              );
            })()}
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
            {/* Notes & Badges Panel */}
            <NotesAndBadgesPanel notes={notes} badges={badges} isAdminView={isAdminView} onAddNote={onAddNote} onAddBadge={onAddBadge} onUpdateBadge={onUpdateBadge} userId={user.id} onGoPerformance={goPerf}/>
          </div>
        )}
      </main>
      {/* AI Training Assistant — trainee view only */}
      {!isAdminView && (
        <TrainingAssistant
          traineeName={user.name}
          currentPhase={pMeta[currentPhaseIdx].label}
          currentSection={cIt?.title || ""}
          progressPct={prog.pct}
          completedTaskCount={prog.doneTasks}
          totalTaskCount={totalTasks}
          passedQuizCount={prog.passedQuizzes}
          totalQuizCount={totalQuizzes}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// NOTES & BADGES PANEL
// ═════════════════════════════════════════════════════════════════════════════

function NotesAndBadgesPanel({ notes, badges, isAdminView, onAddNote, onAddBadge, onUpdateBadge, userId, onGoPerformance }) {
  const [noteText, setNoteText] = useState("");
  const [noteShared, setNoteShared] = useState(false);
  const [noteTag, setNoteTag] = useState(null); // "positive" | "improve" | null
  const [tagError, setTagError] = useState(false);
  const [showBadgeForm, setShowBadgeForm] = useState(false);
  const [customBadge, setCustomBadge] = useState("");
  const [showAllPositive, setShowAllPositive] = useState(false);
  const [showAllImprove, setShowAllImprove] = useState(false);
  const [confirmRemoveBadge, setConfirmRemoveBadge] = useState(null); // badge id being removed
  const [removeReason, setRemoveReason] = useState("");
  const [showRemovedBadges, setShowRemovedBadges] = useState(false);

  const allNotes = notes || [];
  const allBadges = badges || [];
  const activeBadges = allBadges.filter(b => !b.removed);
  const removedBadges = allBadges.filter(b => b.removed);
  const visibleNotes = isAdminView ? allNotes : allNotes.filter(n => n.visibility === "shared" && (n.tag === "positive" || n.tag === "improve"));
  const sorted = [...visibleNotes].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleAddNote = () => {
    if (!noteText.trim() || !onAddNote) return;
    if (noteShared && !noteTag) { setTagError(true); return; }
    setTagError(false);
    onAddNote(userId, {
      id: "n_" + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      author: "Nick Aiola",
      text: noteText.trim(),
      visibility: noteShared ? "shared" : "admin",
      tag: noteTag,
    });
    setNoteText("");
    setNoteShared(false);
    setNoteTag(null);
  };

  const handleAddBadge = (preset) => {
    if (!onAddBadge) return;
    onAddBadge(userId, {
      id: "b_" + Date.now(),
      badgeId: preset.id,
      label: preset.label,
      icon: preset.icon,
      date: new Date().toISOString().slice(0, 10),
      awardedBy: "Nick Aiola",
    });
  };

  const handleAddCustomBadge = () => {
    if (!customBadge.trim() || !onAddBadge) return;
    onAddBadge(userId, {
      id: "b_" + Date.now(),
      badgeId: "custom_" + Date.now(),
      label: customBadge.trim(),
      icon: "🏅",
      date: new Date().toISOString().slice(0, 10),
      awardedBy: "Nick Aiola",
    });
    setCustomBadge("");
    setShowBadgeForm(false);
  };

  return (
    <div style={{marginTop:8,paddingBottom:32}}>
      {/* Badges Section */}
      {(activeBadges.length > 0 || removedBadges.length > 0 || isAdminView) && (
        <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
          <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:12,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Badges & Awards</span>
            {isAdminView && (
              <button onClick={()=>setShowBadgeForm(!showBadgeForm)} style={{padding:"4px 12px",border:`1px solid ${B.bdr}`,borderRadius:6,background:showBadgeForm?"#f1f5f9":"#fff",color:B.t2,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                {showBadgeForm ? "Done" : "+ Award Badge"}
              </button>
            )}
          </div>
          <div style={{padding:"14px 18px"}}>
            {activeBadges.length > 0 ? (
              <div style={{marginBottom:showBadgeForm||confirmRemoveBadge?14:0}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {activeBadges.map(b => (
                    <div key={b.id} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,background:B.blueL,border:`1px solid ${B.blueM}`,fontSize:12,fontWeight:500,color:B.blue}}>
                      <span style={{fontSize:15}}>{b.icon}</span>
                      <span>{b.label}</span>
                      {isAdminView && <span style={{fontSize:9,color:B.t3,marginLeft:2}}>— {b.awardedBy}, {new Date(b.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}
                      {isAdminView && <button onClick={()=>{setConfirmRemoveBadge(b.id);setRemoveReason("")}} style={{background:"none",border:"none",cursor:"pointer",padding:"0 0 0 4px",fontSize:14,color:B.t3,lineHeight:1,fontFamily:"inherit"}} title="Remove badge">×</button>}
                    </div>
                  ))}
                </div>
                {/* Inline removal confirmation */}
                {isAdminView && confirmRemoveBadge && (()=>{
                  const badge = activeBadges.find(b=>b.id===confirmRemoveBadge);
                  if(!badge) return null;
                  return (
                    <div style={{marginTop:10,padding:"10px 14px",border:`1px solid #fecaca`,borderRadius:8,background:"#fef2f2"}}>
                      <div style={{fontSize:11,fontWeight:600,color:B.err,marginBottom:6}}>Remove "{badge.label}"?</div>
                      <input value={removeReason} onChange={e=>setRemoveReason(e.target.value)} placeholder="Reason for removal (optional)" style={{width:"100%",padding:"6px 10px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:11,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:8}}/>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <button onClick={()=>{if(onUpdateBadge)onUpdateBadge(userId,confirmRemoveBadge,{removed:true,removedAt:new Date().toISOString(),removedReason:removeReason.trim()||"No reason given"});setConfirmRemoveBadge(null);setRemoveReason("")}} style={{padding:"5px 14px",border:"none",borderRadius:6,background:B.err,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Remove Badge</button>
                        <button onClick={()=>{setConfirmRemoveBadge(null);setRemoveReason("")}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:B.t3,fontFamily:"inherit",textDecoration:"underline"}}>Cancel</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div style={{fontSize:12,color:B.t3,marginBottom:showBadgeForm?14:0}}>No badges awarded yet.</div>
            )}
            {/* Removed badges — admin only */}
            {isAdminView && removedBadges.length > 0 && (
              <div style={{marginTop:activeBadges.length>0?10:0}}>
                <button onClick={()=>setShowRemovedBadges(!showRemovedBadges)} style={{display:"flex",alignItems:"center",gap:6,border:"none",background:"none",cursor:"pointer",fontSize:11,fontWeight:600,color:B.t3,fontFamily:"inherit",padding:"4px 0"}}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{transition:"transform .15s",transform:showRemovedBadges?"rotate(90deg)":"none"}}><path d="M2 1l4 3-4 3" stroke={B.t3} strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Removed Badges ({removedBadges.length})
                </button>
                {showRemovedBadges && (
                  <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6}}>
                    {removedBadges.map(b => (
                      <div key={b.id} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:16,background:"#f1f5f9",border:`1px solid ${B.bdr}`,fontSize:11,color:B.t3}}>
                        <span style={{fontSize:13,opacity:.5}}>{b.icon}</span>
                        <span style={{textDecoration:"line-through"}}>{b.label}</span>
                        <span style={{fontSize:9}}>· Removed {b.removedAt ? new Date(b.removedAt).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—"}</span>
                        <span style={{fontSize:9}}>· {b.removedReason || "No reason given"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isAdminView && showBadgeForm && (
              <div style={{borderTop:`1px solid ${B.bdr}`,paddingTop:14}}>
                <div style={{fontSize:10,fontWeight:600,color:B.t3,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Select a badge to award:</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                  {BADGE_PRESETS.filter(p => !activeBadges.some(b => b.badgeId === p.id)).map(preset => (
                    <button key={preset.id} onClick={()=>handleAddBadge(preset)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,border:`1px solid ${B.bdr}`,background:"#fff",cursor:"pointer",fontSize:11,fontWeight:500,color:B.t1,fontFamily:"inherit",transition:"all .15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background=B.blueL;e.currentTarget.style.borderColor=B.blue}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor=B.bdr}}>
                      <span>{preset.icon}</span> {preset.label}
                    </button>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input value={customBadge} onChange={e=>setCustomBadge(e.target.value)} placeholder="Or type a custom badge..." style={{flex:1,padding:"7px 12px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
                    onFocus={e=>{e.target.style.borderColor=B.blue}} onBlur={e=>{e.target.style.borderColor=B.bdr}} onKeyDown={e=>{if(e.key==="Enter")handleAddCustomBadge()}}/>
                  <button onClick={handleAddCustomBadge} disabled={!customBadge.trim()} style={{padding:"7px 14px",border:"none",borderRadius:6,background:customBadge.trim()?B.blue:B.bdr,color:"#fff",fontSize:11,fontWeight:600,cursor:customBadge.trim()?"pointer":"default",fontFamily:"inherit"}}>Add</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes Section */}
      {(sorted.length > 0 || isAdminView) && (
        <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden"}}>
          <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`}}>
            <span style={{fontSize:12,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>
              {isAdminView ? "Manager Notes & Concerns" : "Feedback & Areas of Improvement"}
            </span>
          </div>

          {/* Add Note Form — admin only */}
          {isAdminView && (
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${B.bdr}`,background:"#fafbfc"}}>
              <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Add a note about this trainee..." rows={3}
                style={{width:"100%",padding:"10px 12px",border:`1px solid ${B.bdr}`,borderRadius:8,fontSize:13,fontFamily:"'DM Sans',sans-serif",color:B.t1,resize:"vertical",outline:"none",boxSizing:"border-box",transition:"border-color .2s"}}
                onFocus={e=>{e.target.style.borderColor=B.blue}} onBlur={e=>{e.target.style.borderColor=B.bdr}}/>
              <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10,flexWrap:"wrap"}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,color:B.t2,userSelect:"none"}}>
                  <div onClick={()=>{setNoteShared(!noteShared);setTagError(false)}} style={{width:36,height:20,borderRadius:10,background:noteShared?B.blue:B.bdr,cursor:"pointer",position:"relative",transition:"background .2s"}}>
                    <div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:2,left:noteShared?18:2,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                  </div>
                  Visible to trainee
                  {noteShared && <span style={{fontSize:10,fontWeight:600,color:B.ok,background:B.okL,padding:"1px 6px",borderRadius:4}}>Shared</span>}
                </label>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <button type="button" onClick={()=>{setNoteTag(noteTag==="positive"?null:"positive");setTagError(false)}} style={{padding:"5px 12px",borderRadius:14,border:`1.5px solid ${noteTag==="positive"?"#22c55e":B.bdr}`,background:noteTag==="positive"?"#dcfce7":"#fff",color:noteTag==="positive"?"#15803d":B.t2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>🟢 Positive Feedback</button>
                  <button type="button" onClick={()=>{setNoteTag(noteTag==="improve"?null:"improve");setTagError(false)}} style={{padding:"5px 12px",borderRadius:14,border:`1.5px solid ${noteTag==="improve"?B.err:B.bdr}`,background:noteTag==="improve"?"#fee2e2":"#fff",color:noteTag==="improve"?B.err:B.t2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>🔴 Area to Improve</button>
                </div>
                <button onClick={handleAddNote} disabled={!noteText.trim()} style={{padding:"7px 18px",border:"none",borderRadius:7,background:noteText.trim()?B.blue:B.bdr,color:"#fff",fontSize:12,fontWeight:600,cursor:noteText.trim()?"pointer":"default",fontFamily:"inherit",transition:"background .2s",marginLeft:"auto"}}>
                  Add Note
                </button>
              </div>
              {tagError && <div style={{marginTop:6,fontSize:11,color:B.err,fontWeight:500}}>Please select a feedback tag before sharing with trainee.</div>}
              {/* Preview when shared */}
              {noteShared && noteText.trim() && noteTag && (
                <div style={{marginTop:10,padding:"10px 14px",border:`1px dashed ${B.ok}`,borderRadius:8,background:B.okBg}}>
                  <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:B.ok,marginBottom:4}}>Trainee will see ({noteTag === "positive" ? "What's Going Well" : "Areas to Improve"}):</div>
                  <div style={{fontSize:12,color:B.t1,lineHeight:1.5}}>{noteText}</div>
                </div>
              )}
            </div>
          )}

          {/* Notes List */}
          {isAdminView ? (
            sorted.length === 0 ? (
              <div style={{padding:"24px 18px",textAlign:"center",fontSize:13,color:B.t3}}>No notes yet. Add your first note above.</div>
            ) : (
              <div>
                {sorted.map((note, i) => (
                  <div key={note.id} style={{padding:"14px 18px",borderBottom:i<sorted.length-1?`1px solid ${B.bdr}`:"none"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontSize:11,fontWeight:600,color:B.t1}}>{note.author}</span>
                      <span style={{fontSize:10,color:B.t3}}>{new Date(note.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                      {note.tag === "positive" && <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:4,color:"#15803d",background:"#dcfce7"}}>Positive</span>}
                      {note.tag === "improve" && <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:4,color:B.err,background:"#fee2e2"}}>Area to Improve</span>}
                      <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:4,marginLeft:"auto",
                        color:note.visibility==="shared"?B.ok:B.t3,
                        background:note.visibility==="shared"?B.okL:"#f1f5f9",
                      }}>
                        {note.visibility==="shared"?"Shared with Trainee":"Admin Only"}
                      </span>
                    </div>
                    <div style={{fontSize:13,color:B.t1,lineHeight:1.6}}>{note.text}</div>
                  </div>
                ))}
              </div>
            )
          ) : (
            (() => {
              const positiveNotes = sorted.filter(n => n.tag === "positive");
              const improveNotes = sorted.filter(n => n.tag === "improve");
              const posShow = onGoPerformance ? positiveNotes.slice(0, 2) : (showAllPositive ? positiveNotes : positiveNotes.slice(0, 3));
              const impShow = onGoPerformance ? improveNotes.slice(0, 2) : (showAllImprove ? improveNotes : improveNotes.slice(0, 3));
              return (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                  <div style={{borderRight:`1px solid ${B.bdr}`,padding:"14px 18px"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#22c55e",marginBottom:12}}>✅ What's Going Well</div>
                    {positiveNotes.length === 0 ? (
                      <div style={{fontSize:12,color:B.t3,fontStyle:"italic"}}>Nothing here yet.</div>
                    ) : (
                      <>
                        {posShow.map(note => (
                          <div key={note.id} style={{padding:"8px 0",borderBottom:`1px solid #f1f5f9`}}>
                            <div style={{fontSize:10,color:B.t3,marginBottom:2}}>{note.author} · {new Date(note.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                            <div style={{fontSize:13,color:B.t1,lineHeight:1.5}}>{note.text}</div>
                          </div>
                        ))}
                        {onGoPerformance && positiveNotes.length > 2 ? (
                          <button onClick={onGoPerformance} style={{border:"none",background:"none",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",padding:"6px 0"}}>→ See all on My Performance</button>
                        ) : positiveNotes.length > 3 && !onGoPerformance && (
                          <button onClick={()=>setShowAllPositive(!showAllPositive)} style={{border:"none",background:"none",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",padding:"6px 0"}}>
                            {showAllPositive ? "Show less" : `Show all (${positiveNotes.length})`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{padding:"14px 18px"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",marginBottom:12}}>📈 Areas to Improve</div>
                    {improveNotes.length === 0 ? (
                      <div style={{fontSize:12,color:B.t3,fontStyle:"italic"}}>Nothing here yet.</div>
                    ) : (
                      <>
                        {impShow.map(note => (
                          <div key={note.id} style={{padding:"8px 0",borderBottom:`1px solid #f1f5f9`}}>
                            <div style={{fontSize:10,color:B.t3,marginBottom:2}}>{note.author} · {new Date(note.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>
                            <div style={{fontSize:13,color:B.t1,lineHeight:1.5}}>{note.text}</div>
                          </div>
                        ))}
                        {onGoPerformance && improveNotes.length > 2 ? (
                          <button onClick={onGoPerformance} style={{border:"none",background:"none",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",padding:"6px 0"}}>→ See all on My Performance</button>
                        ) : improveNotes.length > 3 && !onGoPerformance && (
                          <button onClick={()=>setShowAllImprove(!showAllImprove)} style={{border:"none",background:"none",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",padding:"6px 0"}}>
                            {showAllImprove ? "Show less" : `Show all (${improveNotes.length})`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TRAINEE KPI DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

function KpiBarChart({ commEntries, teamEntries, weekLabels, target }) {
  const W = 500, H = 200, padL = 30, padR = 10, padT = 10, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const barGroupW = plotW / weekLabels.length;
  const barW = barGroupW * 0.3;
  const barColor = (score) => score >= target ? B.ok : score >= target - 0.3 ? B.warn : B.err;
  return (
    <div style={{marginTop:16}}>
      <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:B.t3,marginBottom:8}}>Performance Chart</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
        {[1,2,3,4,5].map(v=>{const y=padT+plotH-(v/5)*plotH;return <g key={v}><line x1={padL} x2={W-padR} y1={y} y2={y} stroke="#f1f5f9" strokeWidth="1"/><text x={padL-4} y={y+3} textAnchor="end" fontSize="9" fill={B.t3}>{v}</text></g>})}
        {(() => { const ty = padT + plotH - (target / 5) * plotH; return <line x1={padL} x2={W - padR} y1={ty} y2={ty} stroke={B.navy} strokeWidth="1" strokeDasharray="4 3"/>; })()}
        {weekLabels.map((lbl, i) => {
          const cx = padL + i * barGroupW + barGroupW / 2;
          const commScore = commEntries.find(e => e.week === i + 1 + (weekLabels[0] === "W5" ? 4 : weekLabels[0] === "W9" ? 8 : 0));
          const teamScore = teamEntries.find(e => e.week === i + 1 + (weekLabels[0] === "W5" ? 4 : weekLabels[0] === "W9" ? 8 : 0));
          const commH = commScore ? (commScore.score / 5) * plotH : 0;
          const teamH = teamScore ? (teamScore.score / 5) * plotH : 0;
          return (
            <g key={i}>
              {commScore ? <rect x={cx - barW - 1} y={padT + plotH - commH} width={barW} height={commH} rx="2" fill={barColor(commScore.score)} opacity=".85"/> : <rect x={cx - barW - 1} y={padT + plotH - 4} width={barW} height={4} rx="2" fill="#e2e8f0"/>}
              {teamScore ? <rect x={cx + 1} y={padT + plotH - teamH} width={barW} height={teamH} rx="2" fill={barColor(teamScore.score)} opacity=".85" stroke={B.purple} strokeWidth=".5"/> : <rect x={cx + 1} y={padT + plotH - 4} width={barW} height={4} rx="2" fill="#e2e8f0"/>}
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="9" fill={B.t3}>{lbl}</text>
            </g>
          );
        })}
      </svg>
      <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:6,fontSize:10,color:B.t3}}>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:B.blue,display:"inline-block"}}/> Communication</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:B.purple,display:"inline-block"}}/> Teamwork</span>
        <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:2,borderTop:`2px dashed ${B.navy}`,display:"inline-block"}}/> Target ({target.toFixed(1)})</span>
      </div>
    </div>
  );
}

function TraineeKpiDashboard({ user, kpiData, onAddScore, onBackToAdmin, onLogout }) {
  const [showForm, setShowForm] = useState(false);
  const [formKpi, setFormKpi] = useState("communication");
  const [formScore, setFormScore] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0,10));

  const days = daysSince(user.startDate);
  const defaultPhase = days <= 30 ? "day30" : days <= 60 ? "day60" : "day90";
  const [activePhase, setActivePhase] = useState(defaultPhase);
  const [formPhase, setFormPhase] = useState(defaultPhase);

  const PHASES = [
    { id: "day30", label: "Days 1–30", target: 4.0, weeks: ["W1","W2","W3","W4"], weekOffset: 0 },
    { id: "day60", label: "Days 31–60", target: 4.2, weeks: ["W5","W6","W7","W8"], weekOffset: 4 },
    { id: "day90", label: "Days 61–90", target: 4.5, weeks: ["W9","W10","W11","W12"], weekOffset: 8 },
  ];
  const phase = PHASES.find(p => p.id === activePhase);
  const phaseTarget = phase.target;
  const phaseLbl = phase.label;

  const getPhaseEntries = (kpiId) => {
    const all = kpiData?.[kpiId] || [];
    return all.filter(e => {
      const p = e.phase || inferPhase(e.week);
      return p === activePhase;
    });
  };
  const inferPhase = (week) => week <= 4 ? "day30" : week <= 8 ? "day60" : "day90";

  const handleSubmit = (e) => {
    e.preventDefault();
    const s = parseFloat(formScore);
    if (isNaN(s) || s < 1 || s > 5) return;
    const all = kpiData?.[formKpi] || [];
    const maxWeek = all.length > 0 ? Math.max(...all.map(e => e.week)) : 0;
    onAddScore(user.id, formKpi, { week: maxWeek + 1, score: s, manager: "Nick Aiola", date: formDate, comment: formComment, phase: formPhase });
    setFormScore(""); setFormComment(""); setShowForm(false);
  };

  const inputSt = {width:"100%",padding:"10px 12px",border:`1px solid ${B.bdr}`,borderRadius:8,fontSize:13,fontFamily:"'DM Sans',sans-serif",color:B.t1,boxSizing:"border-box",outline:"none",transition:"border-color .2s"};

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",background:B.bg,color:B.t1}}>
      <header className="r-header" style={{background:"#fff",borderBottom:`1px solid ${B.bdr}`,padding:"14px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <Logo size={32}/>
          <div><div className="r-header-title" style={{fontWeight:700,fontSize:15,color:B.navy}}>KPI & Performance</div><div className="r-header-sub" style={{fontSize:11,color:B.t3}}>{user.name} · {user.track || "Advisory"} Track</div></div>
        </div>
        <div className="r-header-right" style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBackToAdmin} className="r-touch" style={{padding:"6px 14px",border:`1px solid ${B.blue}`,borderRadius:6,background:"#fff",color:B.blue,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← Back to Admin</button>
          <button onClick={onLogout} className="r-touch" style={{padding:"6px 14px",border:`1px solid ${B.bdr}`,borderRadius:6,background:"#fff",cursor:"pointer",fontSize:11,color:B.t3,fontFamily:"inherit"}}>Sign Out</button>
        </div>
      </header>
      <div className="r-content" style={{padding:"28px 32px",maxWidth:1200,margin:"0 auto"}}>
        {/* Trainee Info Bar */}
        <div style={{background:"#fff",borderRadius:12,padding:"18px 24px",border:`1px solid ${B.bdr}`,marginBottom:24,display:"flex",alignItems:"center",gap:16,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
          <div style={{width:48,height:48,borderRadius:24,background:B.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700}}>{user.avatar}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:700,color:B.navy}}>{user.name}</div>
            <div style={{fontSize:12,color:B.t3}}>{user.email} · Started {new Date(user.startDate).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3}}>Day {days} of 90</div>
            <div style={{height:5,borderRadius:3,background:B.blueL,overflow:"hidden",width:120,marginTop:6}}><div style={{height:"100%",borderRadius:3,width:`${Math.min(100,Math.round(days/90*100))}%`,background:B.blue,transition:"width .4s"}}/></div>
          </div>
        </div>

        {/* Phase Tabs */}
        <div style={{display:"flex",gap:10,marginBottom:24}}>
          {PHASES.map(p => (
            <button key={p.id} onClick={()=>setActivePhase(p.id)} style={{flex:1,padding:"12px 16px",borderRadius:10,border:`2px solid ${activePhase===p.id?B.blue:B.bdr}`,background:activePhase===p.id?B.blueL:"#fff",cursor:"pointer",fontFamily:"inherit",textAlign:"center",transition:"all .15s"}}>
              <div style={{fontSize:13,fontWeight:700,color:activePhase===p.id?B.blue:B.t1}}>{p.label}</div>
              <div style={{fontSize:10,color:activePhase===p.id?B.blue:B.t3,marginTop:2}}>Target ≥{p.target.toFixed(1)}</div>
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        {ONBOARDING_KPIS.map(kpi => {
          const entries = getPhaseEntries(kpi.id);
          const avg = entries.length > 0 ? (entries.reduce((a, e) => a + e.score, 0) / entries.length) : 0;
          const target = phaseTarget;
          const pct = target > 0 ? Math.min(100, Math.round(avg / target * 100)) : 0;
          const status = entries.length === 0 ? "behind" : avg >= target ? "on-track" : avg >= target - 0.3 ? "at-risk" : "behind";
          const statusColor = status === "on-track" ? B.ok : status === "at-risk" ? B.warn : B.err;
          const statusLabel = status === "on-track" ? "On Track" : status === "at-risk" ? "At Risk" : "Behind";
          const trend = entries.length >= 2 ? (entries[entries.length-1].score >= entries[entries.length-2].score ? "up" : "down") : "flat";

          return (
            <div key={kpi.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${B.bdr}`,marginBottom:20,boxShadow:"0 1px 3px rgba(0,0,0,.04)",overflow:"hidden"}}>
              {/* Card Header */}
              <div style={{padding:"20px 24px",borderBottom:`1px solid ${B.bdr}`}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                      <h3 style={{margin:0,fontSize:15,fontWeight:700,color:B.navy}}>{kpi.category}</h3>
                      <span style={{fontSize:10,fontWeight:600,color:statusColor,background:status==="on-track"?B.okL:status==="at-risk"?B.warnL:"#fef2f2",padding:"2px 8px",borderRadius:10}}>{statusLabel}</span>
                      {trend !== "flat" && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{transform:trend==="down"?"rotate(180deg)":"none"}}>
                          <path d="M7 2L12 9H2L7 2Z" fill={trend==="up"?B.ok:B.err}/>
                        </svg>
                      )}
                    </div>
                    <p style={{margin:0,fontSize:12,color:B.t3,lineHeight:1.5,maxWidth:500}}>{kpi.description}</p>
                  </div>
                  <div style={{textAlign:"right",marginLeft:24}}>
                    <div style={{fontSize:32,fontWeight:700,color:entries.length>0?statusColor:B.t3,lineHeight:1}}>{entries.length > 0 ? avg.toFixed(1) : "—"}</div>
                    <div style={{fontSize:11,color:B.t3,marginTop:2}}>Target: {target.toFixed(1)} ({phaseLbl})</div>
                  </div>
                </div>
                {/* Progress gauge */}
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{flex:1,height:8,borderRadius:4,background:"#f1f5f9",overflow:"hidden",position:"relative"}}>
                    <div style={{height:"100%",borderRadius:4,width:`${entries.length>0?pct:0}%`,background:statusColor,transition:"width .5s"}}/>
                    <div style={{position:"absolute",top:-2,bottom:-2,left:"100%",width:2,background:B.navy,borderRadius:1,transform:"translateX(-1px)"}}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:statusColor,minWidth:40,textAlign:"right"}}>{entries.length > 0 ? `${pct}%` : "N/A"}</span>
                </div>
                <div style={{display:"flex",gap:16,marginTop:8,fontSize:10,color:B.t3}}>
                  <span>Frequency: {kpi.frequency}</span><span>Source: {kpi.source}</span><span>{entries.length} score{entries.length !== 1 ? "s" : ""} in this phase</span>
                </div>
              </div>
              {/* Score History */}
              <div style={{padding:"16px 24px"}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:B.t3,marginBottom:10}}>Score History — {phaseLbl}</div>
                {entries.length === 0 ? (
                  <div style={{padding:"20px 0",textAlign:"center",fontSize:13,color:B.t3}}>No scores recorded for this phase</div>
                ) : (
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"60px 70px 1fr 140px 1fr",padding:"8px 0",borderBottom:`1px solid ${B.bdr}`,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:B.t3}}>
                      <span>Week</span><span>Score</span><span>Visual</span><span>Submitted By</span><span>Comment</span>
                    </div>
                    {entries.map((entry, i) => {
                      const barW = Math.round(entry.score / 5 * 100);
                      const barColor = entry.score >= target ? B.ok : entry.score >= target - 0.3 ? B.warn : B.err;
                      return (
                        <div key={i} style={{display:"grid",gridTemplateColumns:"60px 70px 1fr 140px 1fr",padding:"10px 0",borderBottom:`1px solid ${B.bdr}`,alignItems:"center",fontSize:12}}>
                          <span style={{color:B.t2,fontWeight:600}}>Week {entry.week}</span>
                          <span style={{fontWeight:700,color:barColor}}>{entry.score.toFixed(1)}</span>
                          <div style={{paddingRight:12}}>
                            <div style={{height:6,borderRadius:3,background:"#f1f5f9",overflow:"hidden"}}>
                              <div style={{height:"100%",borderRadius:3,width:`${barW}%`,background:barColor,transition:"width .3s"}}/>
                            </div>
                          </div>
                          <span style={{fontSize:11,color:B.t3}}>{entry.manager}<br/><span style={{fontSize:10}}>{new Date(entry.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span></span>
                          <span style={{fontSize:11,color:B.t2,fontStyle:entry.comment?"italic":"normal"}}>{entry.comment || "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Bar Chart — both KPIs side by side */}
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${B.bdr}`,padding:"20px 24px",marginBottom:20,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
          <KpiBarChart commEntries={getPhaseEntries("communication")} teamEntries={getPhaseEntries("teamwork")} weekLabels={phase.weeks} target={phaseTarget}/>
        </div>

        {/* Add Score Form */}
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${B.bdr}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)",overflow:"hidden"}}>
          <div style={{padding:"18px 24px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <h3 style={{margin:0,fontSize:15,fontWeight:700,color:B.navy}}>Submit New Score</h3>
            <button onClick={()=>setShowForm(!showForm)} style={{padding:"6px 16px",border:"none",borderRadius:8,background:showForm?B.bdr:B.blue,color:showForm?B.t2:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              {showForm ? "Cancel" : "+ Add Score"}
            </button>
          </div>
          {showForm && (
            <form onSubmit={handleSubmit} style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:600,color:B.t2,marginBottom:4}}>KPI Category</label>
                  <select value={formKpi} onChange={e=>setFormKpi(e.target.value)} style={{...inputSt,background:"#fff"}}>
                    {ONBOARDING_KPIS.map(k=><option key={k.id} value={k.id}>{k.category}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:600,color:B.t2,marginBottom:4}}>Phase</label>
                  <select value={formPhase} onChange={e=>setFormPhase(e.target.value)} style={{...inputSt,background:"#fff"}}>
                    <option value="day30">30-Day Phase</option>
                    <option value="day60">60-Day Phase</option>
                    <option value="day90">90-Day Phase</option>
                  </select>
                </div>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:600,color:B.t2,marginBottom:4}}>Score (1.0 – 5.0)</label>
                  <input type="number" min="1" max="5" step="0.1" value={formScore} onChange={e=>setFormScore(e.target.value)} placeholder="e.g. 4.2" required style={inputSt}
                    onFocus={e=>{e.target.style.borderColor=B.blue}} onBlur={e=>{e.target.style.borderColor=B.bdr}}/>
                </div>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:600,color:B.t2,marginBottom:4}}>Date</label>
                <input type="date" value={formDate} onChange={e=>setFormDate(e.target.value)} style={inputSt}
                  onFocus={e=>{e.target.style.borderColor=B.blue}} onBlur={e=>{e.target.style.borderColor=B.bdr}}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:600,color:B.t2,marginBottom:4}}>Comment (optional)</label>
                <input type="text" value={formComment} onChange={e=>setFormComment(e.target.value)} placeholder="Brief note about this score..." style={inputSt}
                  onFocus={e=>{e.target.style.borderColor=B.blue}} onBlur={e=>{e.target.style.borderColor=B.bdr}}/>
              </div>
              <button type="submit" style={{padding:"12px 24px",border:"none",borderRadius:8,background:B.blue,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",alignSelf:"flex-start",transition:"background .2s"}}
                onMouseEnter={e=>{e.currentTarget.style.background=B.blueD}} onMouseLeave={e=>{e.currentTarget.style.background=B.blue}}>
                Submit Score
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CLIENT PORTAL SHELL (standalone view for client role)
// ═════════════════════════════════════════════════════════════════════════════

function ClientPortalShell({ user, onLogout }) {
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",background:B.bg,color:B.t1}}>
      <header className="r-header" style={{background:"#fff",borderBottom:`1px solid ${B.bdr}`,padding:"14px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <Logo size={32}/>
          <div><div className="r-header-title" style={{fontWeight:700,fontSize:15,color:B.navy}}>Client Advisory Portal</div><div className="r-header-sub" style={{fontSize:11,color:B.t3}}>Welcome, {user.name}</div></div>
        </div>
        <div className="r-header-right" style={{display:"flex",alignItems:"center",gap:16}}>
          <div className="r-hide-mobile" style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:600,color:B.t1}}>{user.name}</div><div style={{fontSize:11,color:B.t3}}>Client</div></div>
          <div style={{width:36,height:36,borderRadius:18,background:B.ok,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{user.avatar}</div>
          <button onClick={onLogout} className="r-touch" style={{padding:"6px 14px",border:`1px solid ${B.bdr}`,borderRadius:6,background:"#fff",cursor:"pointer",fontSize:11,color:B.t3,fontFamily:"inherit"}}>Sign Out</button>
        </div>
      </header>
      <div className="r-content" style={{padding:"28px 32px",maxWidth:1400,margin:"0 auto"}}>
        <ClientPortalDemo />
      </div>
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

  const handleLogin = u => { setCurrentUser(u); setView(u.role==="admin"?"admin":u.role==="client"?"client":"trainee"); };
  const handleLogout = () => { setCurrentUser(null); setView("login"); setViewingTrainee(null); };
  const toggleTask = uid => tid => setAllUserData(p=>({...p,[uid]:{tasks:{...(p[uid]?.tasks||{}),[tid]:!(p[uid]?.tasks?.[tid])},quizzes:p[uid]?.quizzes||{}}}));
  const passQuiz = uid => (iid, result) => {
    // result can be: undefined (legacy single-question pass) or {passed, questions}
    const val = result || true;
    setAllUserData(p=>({...p,[uid]:{tasks:p[uid]?.tasks||{},quizzes:{...(p[uid]?.quizzes||{}),[iid]:val}}}));
  };
  const [kpiData, setKpiData] = useState({...KPI_SEED_DATA});
  const [notesData, setNotesData] = useState({...NOTES_SEED_DATA});
  const viewTrainee = t => { setViewingTrainee(t); setView("trainee-admin"); };
  const viewTraineeKpi = t => { setViewingTrainee(t); setView("trainee-kpi"); };
  const addKpiScore = (uid, kpiId, entry) => {
    setKpiData(prev => ({...prev, [uid]: {...(prev[uid]||{}), [kpiId]: [...((prev[uid]||{})[kpiId]||[]), entry]}}));
  };
  const addNote = (uid, note) => {
    setNotesData(prev => ({...prev, [uid]: {...(prev[uid]||{notes:[],badges:[]}), notes: [...((prev[uid]||{}).notes||[]), note]}}));
  };
  const addBadge = (uid, badge) => {
    setNotesData(prev => ({...prev, [uid]: {...(prev[uid]||{notes:[],badges:[]}), badges: [...((prev[uid]||{}).badges||[]), badge]}}));
  };
  const updateBadge = (uid, badgeId, updates) => {
    setNotesData(prev => {
      const d = prev[uid] || { notes: [], badges: [] };
      return {...prev, [uid]: {...d, badges: (d.badges||[]).map(b => b.id === badgeId ? {...b, ...updates} : b)}};
    });
  };

  // Report modal state: { trainee, isTraineeReport }
  const [reportModal, setReportModal] = useState(null);

  const handleGenerateReport = (t) => {
    setReportModal({ trainee: t, isTraineeReport: false });
  };

  const handleTraineeReport = (t) => {
    setReportModal({ trainee: t, isTraineeReport: true });
  };

  const executeReport = (dateFrom, dateTo) => {
    if (!reportModal) return;
    const t = reportModal.trainee;
    const uid = t.id;
    const nd = notesData[uid] || { notes: [], badges: [] };
    generateMilestoneReport(t, allUserData[uid], kpiData[uid] || {}, nd, { dateFrom, dateTo, isTraineeReport: reportModal.isTraineeReport });
    setReportModal(null);
  };

  let content = null;
  if(view==="login") content = <LoginScreen onLogin={handleLogin}/>;
  else if(view==="admin") content = <AdminDashboard user={currentUser} allData={allUserData} onViewTrainee={viewTrainee} onViewKpi={viewTraineeKpi} onGenerateReport={handleGenerateReport} onLogout={handleLogout}/>;
  else if(view==="trainee-kpi"&&viewingTrainee) content = <TraineeKpiDashboard user={viewingTrainee} kpiData={kpiData[viewingTrainee.id]||{}} onAddScore={addKpiScore} onBackToAdmin={()=>setView("admin")} onLogout={handleLogout}/>;
  else if(view==="trainee-admin"&&viewingTrainee){ const uid=viewingTrainee.id; const nd=notesData[uid]||{notes:[],badges:[]}; content = <TraineePortal user={viewingTrainee} completedTasks={allUserData[uid]?.tasks||{}} quizResults={allUserData[uid]?.quizzes||{}} onToggleTask={toggleTask(uid)} onPassQuiz={passQuiz(uid)} onLogout={handleLogout} isAdminView={true} onBackToAdmin={()=>setView("admin")} onGenerateReport={()=>handleGenerateReport(viewingTrainee)} notes={nd.notes} badges={nd.badges} onAddNote={addNote} onAddBadge={addBadge} onUpdateBadge={updateBadge} kpiData={kpiData[uid]||{}}/>; }
  else if(view==="trainee"&&currentUser){ const uid=currentUser.id; const nd=notesData[uid]||{notes:[],badges:[]}; content = <TraineePortal user={currentUser} completedTasks={allUserData[uid]?.tasks||{}} quizResults={allUserData[uid]?.quizzes||{}} onToggleTask={toggleTask(uid)} onPassQuiz={passQuiz(uid)} onLogout={handleLogout} isAdminView={false} onBackToAdmin={null} notes={nd.notes} badges={nd.badges} kpiData={kpiData[uid]||{}} onGenerateReport={()=>handleTraineeReport(currentUser)}/>; }
  else if(view==="client"&&currentUser) content = <ClientPortalShell user={currentUser} onLogout={handleLogout}/>;

  return <>
    <style>{RESPONSIVE_CSS}</style>
    {content}
    {reportModal && <ReportDateModal title={reportModal.isTraineeReport ? "Generate My Progress Report" : "Generate Milestone Report"} startDate={reportModal.trainee.startDate} onGenerate={executeReport} onClose={()=>setReportModal(null)}/>}
  </>;
}
