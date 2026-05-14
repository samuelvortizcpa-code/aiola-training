import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import AssessmentModule from "./components/assessment/AssessmentModule.jsx";
import TopicMastery from "./components/assessment/TopicMastery.jsx";
import WeeklyReview from "./components/assessment/WeeklyReview.jsx";
import ConfidentMisses from "./components/assessment/ConfidentMisses.jsx";
import CohortHeatmap from "./components/assessment/CohortHeatmap.jsx";
import { migrateLegacyQuiz } from "./lib/migrateLegacyQuiz.js";
import { storage, scorecards } from './lib/storage';

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
    id: "week1", label: "Week 1", subtitle: "Firm Tools & Onboarding", phase: "Days 1–30",
    items: [
      // ── Day 1 — Environment Setup & Security ──
      {
        id: "d1", title: "Day 1 — Environment Setup & Security",
        description: "Get your accounts, devices, and security baseline established. By end of day you should be able to log in everywhere, send a properly-signed email, and access the firm's tools without IT escalation.",
        topicTags: ["security", "onboarding", "aiola_culture"],
        tasks: [
          { id: "d1t1", text: "Complete IT onboarding: laptop receipt, peripherals, monitor setup" },
          { id: "d1t2", text: "Activate your Aiola Microsoft 365 account and configure Outlook" },
          { id: "d1t3", text: "Change all default passwords on first login (M365, Slack, ClickUp, Front)" },
          { id: "d1t4", text: "Enable multi-factor authentication on every account — no exceptions" },
          { id: "d1t5", text: "Configure your Aiola email signature using the firm template (TODO_NICK: link to signature template)" },
          { id: "d1t6", text: "Join required Slack channels (TODO_NICK: list of required channels)" },
          { id: "d1t7", text: "Read the Aiola CPA Employee Handbook (TODO_NICK: link to handbook), pages 1–end" },
        ],
        resources: [
          { label: "Employee Handbook", url: null /* TODO_NICK */ },
          { label: "IT Setup Checklist", url: null /* TODO_NICK */ },
          { label: "Email Signature Template", url: null /* TODO_NICK */ },
          { label: "Required Slack Channels", url: null /* TODO_NICK */ },
          { label: "Microsoft 365 Admin Portal", url: "https://admin.microsoft.com" },
        ],
        assessment: [
          {
            type: "DRAG_EXERCISE", id: "d1_match_tools",
            title: "Tool → Purpose",
            prompt: "Match each tool to its primary purpose at Aiola.",
            mode: "match",
            pairs: [
              { a: { id: "slack", label: "Slack" }, b: { id: "p_slack", label: "Internal team chat & quick collaboration" } },
              { a: { id: "front", label: "Front" }, b: { id: "p_front", label: "Shared client email inbox & client communication" } },
              { a: { id: "clickup", label: "ClickUp" }, b: { id: "p_clickup", label: "Tasks, projects & client engagement tracking" } },
              { a: { id: "m365", label: "Microsoft 365" }, b: { id: "p_m365", label: "Email, calendar, documents & file storage" } },
              { a: { id: "outlook_cal", label: "Outlook Calendar" }, b: { id: "p_outlook", label: "Meeting scheduling & availability management" } },
            ],
            decoys: [],
            topicTags: ["aiola_culture", "onboarding"],
            explanation: "Each tool has a distinct lane. Internal team chat goes in Slack, never Front. Client email always goes through Front so the team has visibility. Tasks live in ClickUp — never in Slack DMs.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d1_mcq_mfa",
            question: "What's the FIRST thing you should do after receiving your laptop and login credentials?",
            options: [
              "Start reviewing the team's active client files to learn the practice",
              "Change all default passwords and enable multi-factor authentication",
              "Set up your email signature so outgoing messages look professional",
              "Join all the Slack channels so you don't miss anything",
            ],
            correct: 1,
            topicTags: ["security", "onboarding"],
            difficulty: 2,
            explanation: "Security baseline comes before anything else. A CPA firm holds SSNs, tax returns, and bank info — a compromised account on day one is a client-trust catastrophe. Default passwords must be changed and MFA enabled before you touch any client data.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d1_mcq_mfa_why",
            question: "Why is MFA non-negotiable at a CPA firm specifically (vs. just a 'nice to have')?",
            options: [
              "Insurance carriers require it for cyber liability coverage",
              "It's IRS-mandated under Pub 4557 safeguards",
              "Both A and B, plus client data exposure carries direct civil liability under state breach notification laws",
              "It's a cultural preference at Aiola",
            ],
            correct: 2,
            topicTags: ["security"],
            difficulty: 3,
            explanation: "All three matter. IRS Pub 4557 requires written security plans including authentication safeguards. Most cyber liability carriers require MFA for coverage. And state breach notification laws (e.g., FL Information Protection Act) impose direct duties when PII is exposed. MFA isn't optional.",
          },
        ],
      },

      // ── Day 2 — ClickUp Mastery ──
      {
        id: "d2", title: "Day 2 — ClickUp Mastery",
        description: "ClickUp is where every Aiola task lives. By Friday you should be able to find any active task, create new tasks following our naming convention, and move them through our status flow without asking.",
        topicTags: ["clickup_workflow", "aiola_culture"],
        tasks: [
          { id: "d2t1", text: "Complete ClickUp University: \"Getting Started\" + \"Working with Tasks\" courses" },
          { id: "d2t2", text: "Set up your personal ClickUp Home view with My Work, Today, and Overdue widgets" },
          { id: "d2t3", text: "Review the Aiola workspace structure: Spaces → Folders → Lists hierarchy (TODO_NICK: ask your Manager to walk through)" },
          { id: "d2t4", text: "Read Aiola's task naming convention SOP (TODO_NICK: link to SOP)" },
          { id: "d2t5", text: "Practice creating, assigning, commenting on, and closing 3 sample tasks in your personal Space" },
          { id: "d2t6", text: "Review the team's currently active client engagement board (TODO_NICK: link to board)" },
        ],
        resources: [
          { label: "ClickUp University", url: "https://university.clickup.com/" },
          { label: "Aiola ClickUp SOP & Naming Conventions", url: null /* TODO_NICK */ },
          { label: "Active Client Engagement Board", url: null /* TODO_NICK */ },
        ],
        assessment: [
          {
            type: "DRAG_EXERCISE", id: "d2_order_lifecycle",
            title: "Aiola Task Status Flow",
            prompt: "Drag these statuses into the correct order for a typical Aiola task lifecycle.",
            // TODO_NICK: confirm Aiola's actual status flow names. Below is a reasonable industry-standard placeholder.
            mode: "order",
            items: [
              { id: "s_todo", label: "To Do" },
              { id: "s_progress", label: "In Progress" },
              { id: "s_review", label: "In Review" },
              { id: "s_pending", label: "Pending Client" },
              { id: "s_done", label: "Done" },
            ],
            correctSequence: ["s_todo", "s_progress", "s_review", "s_pending", "s_done"],
            topicTags: ["clickup_workflow"],
            explanation: "TODO_NICK: confirm this matches Aiola's actual status flow. The general principle: tasks move from intake → active work → manager review → client-blocked (if waiting on inputs) → done. 'Pending Client' is a critical status — it tells the team a task is blocked externally, not internally.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d2_mcq_naming",
            question: "You're creating a task to draft a TSR for a new advisory client named John Smith. What's the right approach to naming the task?",
            options: [
              "Use a casual descriptive name like 'TSR for John' so it's quick to read",
              "Follow the firm's naming convention SOP (TODO_NICK: confirm format) — consistent naming makes tasks searchable, sortable, and reportable",
              "Whatever you want — ClickUp's search will find it anyway",
              "Use the client's full SSN in the task title for unique identification",
            ],
            correct: 1,
            topicTags: ["clickup_workflow"],
            difficulty: 2,
            explanation: "Naming conventions exist because the team will eventually have hundreds of active tasks. Consistent prefixes (e.g., '[Client Last] – [Deliverable] – [Year]') make tasks searchable and reportable. Never put PII like SSNs in task titles — task titles are not encrypted at rest in most PM tools.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d2_mcq_status",
            question: "You've finished your portion of a client deliverable but it needs your Manager's review before going out. What status do you move the task to?",
            options: [
              "Done — your portion is finished",
              "In Review — signaling it's awaiting manager review (TODO_NICK: confirm exact status name)",
              "Pending Client — since the client hasn't seen it yet",
              "Leave it In Progress — the work is technically not done",
            ],
            correct: 1,
            topicTags: ["clickup_workflow", "front_protocol"],
            difficulty: 3,
            explanation: "Status accuracy is how the team operates without standups. 'In Review' tells your Manager (and the team) that work is awaiting manager review — distinct from 'Pending Client' (waiting on client) and 'Done' (fully closed). Mis-statusing a task is the #1 way work gets lost.",
          },
        ],
      },

      // ── Day 3 — Front (Client Communication) ──
      {
        id: "d3", title: "Day 3 — Front (Client Communication)",
        description: "Front is the team's shared inbox for client email. Unlike personal email, every client message is visible to the team — which is the point. By end of day you should know how to triage, tag, assign, and respond appropriately.",
        topicTags: ["front_protocol", "client_escalation", "aiola_culture"],
        tasks: [
          { id: "d3t1", text: "Tour the Front workspace: shared inboxes, your assigned conversations, mentions" },
          { id: "d3t2", text: "Read Aiola's Front protocol SOP (TODO_NICK: link to SOP) — covers tags, assignments, escalation" },
          { id: "d3t3", text: "Review the firm's response time SLAs by message type (TODO_NICK: link to SLA matrix)" },
          { id: "d3t4", text: "Practice composing a client reply using firm-approved templates (TODO_NICK: link to templates)" },
          { id: "d3t5", text: "Learn the escalation rules: when to @-mention your Manager, when to assign to a senior advisor" },
          { id: "d3t6", text: "Shadow a senior advisor's Front session for 30 minutes (TODO_NICK: schedule with your Manager)" },
        ],
        resources: [
          { label: "Front Help Center", url: "https://help.front.com/" },
          { label: "Aiola Front Protocol SOP", url: null /* TODO_NICK */ },
          { label: "Response Time SLA Matrix", url: null /* TODO_NICK */ },
          { label: "Reply Template Library", url: null /* TODO_NICK */ },
        ],
        assessment: [
          {
            type: "DRAG_EXERCISE", id: "d3_match_sla",
            title: "Message Type → Response SLA",
            prompt: "Match each client message type to its expected response SLA. (Note: actual SLAs are firm policy — TODO_NICK: confirm.)",
            mode: "match",
            pairs: [
              { a: { id: "urgent", label: "Urgent client question (deadline imminent)" }, b: { id: "sla1", label: "Within a few business hours (TODO_NICK: confirm)" } },
              { a: { id: "routine", label: "Routine client question or update" }, b: { id: "sla2", label: "Within 1 business day (TODO_NICK: confirm)" } },
              { a: { id: "marketing", label: "Marketing or non-client outreach" }, b: { id: "sla3", label: "Within 2-3 business days (TODO_NICK: confirm)" } },
              { a: { id: "internal", label: "Internal team cc with no action needed" }, b: { id: "sla4", label: "No response required" } },
            ],
            decoys: [],
            topicTags: ["front_protocol"],
            explanation: "TODO_NICK: confirm Aiola's actual SLAs by message type. The general principle: speed of response is part of advisory service quality. Clients evaluate firms partly on responsiveness — having explicit SLAs prevents 'lost' messages.",
          },
          {
            type: "SCENARIO_BRANCHING", id: "d3_scenario_urgent",
            title: "First Real Client Message",
            topicTags: ["front_protocol", "client_escalation", "advisory_vs_prep"],
            context: "It's Tuesday 4:47 PM. A new advisory client (closed last week — Aerin Rivera) sends an urgent Front message: 'IRS notice arrived today. They're saying I owe $48,000 from 2023, due in 10 days. your Manager told me to message here if anything came up. What do I do?' You've never spoken to this client before.",
            decisions: [
              {
                id: "dec1", prompt: "What's your FIRST move?",
                options: [
                  { text: "Reply on Front immediately with reassurance and ask them to upload the IRS notice", weight: 2, correctness: "acceptable", nextId: "dec2", terminalId: null },
                  { text: "Reply acknowledging receipt, ask them to upload the notice via Front, and schedule a 30-min call within 24 hours; @-mention your Manager on the conversation", weight: 3, correctness: "great", nextId: "dec2_great", terminalId: null },
                  { text: "Forward to your Manager and wait for them to respond — you don't know this client yet", weight: 1, correctness: "risky", nextId: null, terminalId: "t_deflect" },
                  { text: "Reply that they should file an extension immediately", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_wrong_advice" },
                ],
              },
              {
                id: "dec2_great", prompt: "your Manager is in client meetings until tomorrow. The client uploads the notice — it's a CP2000 (proposed assessment, not a final bill). What do you do next?",
                options: [
                  { text: "Reply immediately telling the client they don't owe anything because CP2000 is just proposed", weight: 1, correctness: "risky", nextId: null, terminalId: "t_overconfident" },
                  { text: "Acknowledge receipt, note that CP2000 is a proposed assessment with response options (agree/disagree/partial), and confirm the call time so you can review together with proper context", weight: 3, correctness: "great", nextId: null, terminalId: "t_great" },
                  { text: "Tell the client to ignore it because CP2000s are usually wrong", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_wrong_advice" },
                ],
              },
              {
                id: "dec2", prompt: "Same path — what's your follow-up after the initial reply?",
                options: [
                  { text: "Wait for the client to send more info", weight: 1, correctness: "risky", nextId: null, terminalId: "t_passive" },
                  { text: "@-mention your Manager on the conversation and schedule the follow-up call for tomorrow", weight: 3, correctness: "great", nextId: null, terminalId: "t_recovery" },
                ],
              },
            ],
            terminals: [
              { id: "t_great", label: "Pro Response", outcome: "great", coachingNote: "Textbook. You acknowledged urgency, gathered the document, looped in your Manager, and didn't give substantive tax advice you couldn't fully verify. CP2000 is a proposed assessment with response options under IRC §6213 — never definitive. Reviewing in context first is the right call." },
              { id: "t_recovery", label: "Solid Recovery", outcome: "acceptable", coachingNote: "Decent. You got the right outcome eventually. Best practice is @-mention your Manager and schedule the call in the same first reply, not as a separate follow-up." },
              { id: "t_overconfident", label: "Premature Reassurance", outcome: "risky", coachingNote: "CP2000 is a PROPOSED assessment. Sometimes the IRS is right (missed 1099, unreported income). Telling a client they don't owe before reviewing the underlying issue can create false security and missed deadlines. Always review before reassuring." },
              { id: "t_passive", label: "Passive Waiting", outcome: "risky", coachingNote: "10-day deadlines mean someone has to drive the timeline. Passive waiting on a CP2000 is how clients miss the response window and the proposed assessment becomes final." },
              { id: "t_deflect", label: "Pure Deflection", outcome: "risky", coachingNote: "Forwarding without engagement leaves the client feeling unsupported. The right move is engage warmly, gather facts, AND loop in your Manager — not 'or'." },
              { id: "t_wrong_advice", label: "Wrong Advice", outcome: "harmful", coachingNote: "Filing an extension doesn't apply to a CP2000 (it's a notice, not a return). Telling a client to ignore an IRS notice is malpractice-territory. When you don't know — escalate, don't improvise." },
            ],
          },
          {
            type: "CONFIDENCE_MCQ", id: "d3_mcq_dm",
            question: "A client adds you to an email thread asking a quick question. You happen to know the answer. What do you do?",
            options: [
              "Reply directly from your personal Outlook so the client gets a fast response",
              "Forward the email to Front and reply from there so the team has visibility",
              "Reply from Outlook AND cc Front to keep both records",
              "Wait for someone else on the team to pick it up in Front",
            ],
            correct: 1,
            topicTags: ["front_protocol"],
            difficulty: 2,
            explanation: "Front is the single source of truth for client email. Replying from personal Outlook breaks team visibility — if your Manager picks up the relationship next month, he won't see your prior conversation. Always route through Front.",
          },
        ],
      },

      // ── Day 4 — Firm Culture & Advisory Overview ──
      {
        id: "d4", title: "Day 4 — Firm Culture & Advisory Overview",
        description: "Aiola is an advisory-first firm — that's the unique value proposition. Today you'll learn what advisory means at Aiola, how it differs from compliance tax prep, and the engagement flow from first contact to recurring relationship.",
        topicTags: ["aiola_culture", "advisory_vs_prep", "ism_structure"],
        tasks: [
          { id: "d4t1", text: "Read the Aiola Culture Manual (TODO_NICK: link), focus on advisory mission & client philosophy" },
          { id: "d4t2", text: "Read \"Advisory vs. Tax Prep\" overview — Aiola's positioning (TODO_NICK: link)" },
          { id: "d4t3", text: "Watch: 30-min recorded overview from your Manager on what makes an Aiola advisory engagement (TODO_NICK: record)" },
          { id: "d4t4", text: "Review the standard Aiola engagement flow: Discovery Call → Onboarding Questionnaire → ISM → TSR → Implementation → Quarterly Checkups" },
          { id: "d4t5", text: "Read the Tjahjadi Onboarding Questionnaire (in project knowledge: Michael_Tjahjadi__Aerin_Ha__Advisory_Onboarding_Questionnaire) as a real example" },
          { id: "d4t6", text: "Submit 3 questions about Aiola's advisory model to your manager via ClickUp" },
        ],
        resources: [
          { label: "Aiola Culture Manual", url: null /* TODO_NICK */ },
          { label: "Advisory vs Tax Prep Overview", url: null /* TODO_NICK */ },
          { label: "Sample Onboarding Questionnaire (Tjahjadi)", url: "/docs/Michael_Tjahjadi_Onboarding.pdf" },
          { label: "Standard Engagement Flow Diagram", url: null /* TODO_NICK */ },
        ],
        assessment: [
          {
            type: "DRAG_EXERCISE", id: "d4_order_engagement",
            title: "Aiola Engagement Flow",
            prompt: "Drag these stages into the correct order for a standard Aiola advisory engagement.",
            mode: "order",
            items: [
              { id: "e_discovery", label: "Discovery Call (free intro)" },
              { id: "e_quest", label: "Onboarding Questionnaire (sent post-proposal-signing)" },
              { id: "e_ism", label: "Initial Strategy Meeting (ISM)" },
              { id: "e_tsr", label: "Tax Strategy Roadmap (TSR) delivered" },
              { id: "e_impl", label: "Implementation phase" },
              { id: "e_checkup", label: "Quarterly Checkups (recurring)" },
            ],
            correctSequence: ["e_discovery", "e_quest", "e_ism", "e_tsr", "e_impl", "e_checkup"],
            topicTags: ["ism_structure", "advisory_vs_prep", "checkup_cadence"],
            explanation: "Discovery is the qualification call — does the firm fit the client and vice versa. Questionnaire goes BEFORE the ISM so the meeting is informed. ISM happens with full context; TSR is the deliverable that comes out of the meeting. Implementation = the strategies happening. Checkups keep the engagement alive.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d4_mcq_advisory_v_prep",
            question: "What's the clearest way to describe how Aiola's advisory engagements differ from a typical tax prep relationship?",
            options: [
              "Advisory is more expensive than tax prep",
              "Advisory is forward-looking strategic planning with ongoing relationship and proactive outreach; tax prep is backward-looking compliance filing",
              "Advisory clients get faster turnaround on returns",
              "Advisory is just tax prep with extra meetings",
            ],
            correct: 1,
            topicTags: ["advisory_vs_prep", "aiola_culture"],
            difficulty: 2,
            explanation: "Tax prep is historical — last year's return, file by April 15, transactional. Advisory is forward-looking — strategies for THIS year and next, ongoing quarterly engagement, TSR deliverable, and proactive outreach. The relationship structure is fundamentally different. Price is a downstream consequence, not the difference.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d4_mcq_questionnaire",
            question: "Why is the Onboarding Questionnaire sent AFTER the proposal is signed but BEFORE the Initial Strategy Meeting?",
            options: [
              "To confirm the client is committed before doing prep work",
              "So the ISM is informed by real client data — financials, goals, prior returns — rather than starting from scratch",
              "Because the IRS requires written intake before advisory work",
              "To bill the client for the prep time",
            ],
            correct: 1,
            topicTags: ["ism_structure", "advisory_vs_prep"],
            difficulty: 2,
            explanation: "An ISM where you're learning basic facts (income, entities, properties) wastes the client's hour. The questionnaire collects baseline data ahead of time so the meeting can focus on strategy, not data entry. Pre-meeting prep is what makes advisory feel different from a generic CPA conversation.",
          },
        ],
      },

      // ── Day 5 — Week 1 Wrap-Up & Spaced Review ──
      {
        id: "d5", title: "Day 5 — Week 1 Wrap-Up & Spaced Review",
        description: "Consolidate everything from Days 1–4. Surface anything that's still unclear so you go into Week 2 with a solid tools foundation.",
        topicTags: ["aiola_culture", "clickup_workflow", "front_protocol", "security", "advisory_vs_prep", "ism_structure", "onboarding"],
        tasks: [
          { id: "d5t1", text: "Verify all systems work end-to-end: send a test email through Front, create + close a ClickUp task, post in your assigned Slack channel" },
          { id: "d5t2", text: "Document any outstanding questions in a single ClickUp task assigned to your manager" },
          { id: "d5t3", text: "Review next week's training schedule (Week 2 — §469, the STR Exception, and REPS Qualification)" },
          { id: "d5t4", text: "Submit your Week 1 self-reflection: what landed, what's still fuzzy, what surprised you" },
          { id: "d5t5", text: "30-min Friday wrap-up call with your Manager (TODO_NICK: confirm cadence)" },
        ],
        resources: [
          { label: "Week 1 Self-Reflection Form", url: null /* TODO_NICK */ },
        ],
        assessment: [
          // Cross-topic retention checks — spaced repetition will also auto-prepend missed items
          {
            type: "CONFIDENCE_MCQ", id: "d5_mcq_advisory_relationship",
            question: "Which of these signals you're treating a client as ADVISORY (not just tax prep)?",
            options: [
              "You only contact them once a year to gather documents",
              "You proactively reach out about Q4 estimated payments before they ask, schedule a checkup mid-year, and deliver a TSR",
              "You file their return with extra schedules",
              "You bill them at a higher rate",
            ],
            correct: 1,
            topicTags: ["advisory_vs_prep", "checkup_cadence", "tsr_delivery"],
            difficulty: 3,
            explanation: "Behavior, not pricing, defines advisory. Proactive outreach (you reach out before they do), recurring checkups, and a TSR deliverable are the operating signals. If a client only hears from you in March, they're getting tax prep, not advisory — regardless of fee.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d5_mcq_communication_routing",
            question: "A client texts your personal cell phone with a tax question on a Saturday. What's the right response?",
            options: [
              "Answer immediately on text — responsive service builds the relationship",
              "Reply briefly that you'll respond Monday via Front (the team's record system) so it's properly tracked, and don't engage on personal text",
              "Ignore until Monday and respond from Outlook",
              "Tell the client to never text you again",
            ],
            correct: 1,
            topicTags: ["front_protocol", "client_escalation"],
            difficulty: 3,
            explanation: "Two issues here: (1) personal text breaks team visibility — your Manager can't see what was discussed, (2) it sets a precedent for off-hours, off-channel communication that erodes the team's operating rhythm. Polite redirect to Front is the move. Responsiveness is good; channel discipline is also good.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d5_mcq_tools_summary",
            question: "By the end of Week 1, which of the following should be fully complete?",
            options: [
              "Your first independent advisory client meeting",
              "All system setups (M365/Slack/Front/ClickUp), security baseline, firm orientation, and engagement flow understanding",
              "A full Schedule E review for a real client",
              "Your 90-day performance review",
            ],
            correct: 1,
            topicTags: ["aiola_culture", "onboarding"],
            difficulty: 1,
            explanation: "Week 1 is foundational only — tools, security, orientation. No client-facing work, no advisory deliverables. Week 2 begins the actual tax/advisory training.",
          },
        ],
      },
    ],
  },
  {
    id: "week2", label: "Week 2", subtitle: "§469, the STR Exception, and REPS Qualification", phase: "Days 1–30",
    items: [
      {
        id: "week2_main",
        title: "Week 2 — §469, the STR Exception, and REPS Qualification",
        weekStart: "May 11, 2026",
        weekEnd: "May 15, 2026",
        description: "This week you build the foundation of real-estate-focused tax advisory: passive activity rules, the short-term rental exception, material participation, and the Real Estate Professional Status (REPS) qualification.\n\nBy end of week you have three deliverables: a Wednesday presentation walking your Manager through the STR strategy framework end-to-end, a Friday presentation walking through REPS qualification end-to-end, and a 20-question end-of-week assessment that lets you self-check your understanding before delivering. Both presentations must be technical, grounded in primary authority, and designed so a peer (or a client, with tone-adjustment) could follow them.\n\nNo prescribed daily schedule. Manage your own time. Target depth ~6 hours per day. Authoritative sources for this week live in the IRC, Treasury Regulations, IRS publications and audit technique guides, and Tax Court opinions. You\u2019re expected to identify and cite the specific sections yourself. Primary authority only; secondary commentary as context. Tax law changes: verify currency of any source you cite, and bring questions to your Manager.",
        topicTags: [
          "str_loophole", "avg_stay_test", "rental_classification", "passive_loss",
          "suspended_losses", "material_participation_tests", "reps_750hr",
          "reps_50pct_test", "reps_aggregation_election", "mp_500hr",
          "mp_100hr_more_than_anyone", "mp_aggregation", "w2_real_estate_employee",
          "special_25k_allowance", "schedule_e"
        ],
        weeklyRubric: {
          title: "Week 2 Scorecard",
          intro: "This rubric applies to BOTH your Wednesday STR presentation AND your Friday REPS presentation. Pressure-test your own work against it before delivering.",
          categories: [
            { num: 1, name: "Technical Accuracy", desc: "Rules, tests, thresholds, and exceptions stated correctly. No doctrinal errors." },
            { num: 2, name: "Authoritative Sourcing", desc: "Every claim tied to IRC / Reg / IRS guidance / case law with specific citations. Binding authority distinguished from secondary." },
            { num: 3, name: "Coverage & Completeness", desc: "All key elements addressed: definitions, qualifications, every relevant test, exceptions, gray areas, audit defensibility." },
            { num: 4, name: "Application to Real Client Facts", desc: "Framework cleanly applied to assigned client. Gray areas and risks named with what it would take to resolve them." },
            { num: 5, name: "Communication & Defensibility", desc: "Peer can follow it from the deck alone. Holds up under Q&A. Substance could be delivered to a client with tone adjustment." }
          ],
          banding: "Each category scored 1\u20134. Total: 20. 17\u201320 Mastery (pass) \u00b7 14\u201316 Proficient (pass) \u00b7 11\u201313 Developing (conditional pass with re-work) \u00b7 \u226410 Below Bar.",
          fullDocLink: "/scorecard-week2.html",
          fullDocLabel: "View Full Scorecard"
        },
        learningObjectives: [
          "Explain the §469 framework: passive vs nonpassive activity, and why losses default to suspended",
          "Apply the STR test: average customer use \u2264 7 days excludes from \u2018rental activity\u2019 definition under Reg §1.469-1T(e)(3)(ii)(A)",
          "Identify all 6 exceptions to rental activity classification under Reg §1.469-1T(e)(3)(ii)",
          "Explain §469(g) suspended loss release on full disposition and its interaction with §1031",
          "Diagnose the correct §469 path (STR, REPS, neither) for different client profiles",
          "Identify when aggregation election is needed vs when STR exception applies per-activity",
          "Recognize that the STR exception is per-activity, not portfolio-wide",
          "Recite the 7 material participation tests under Reg §1.469-5T(a) and identify which apply to a given fact pattern",
          "Compute the federal + state after-tax savings from converting an STR loss from passive to non-passive",
          "Apply the §469(c)(7) two-part REPS test (750-hour + 50%) to any taxpayer fact pattern",
          "Explain the §469(c)(7)(A) aggregation election: how it\u2019s made, when beneficial, what \u2018binding\u2019 means, disposition risk",
          "Articulate the difference between active participation (§469(i)) and material participation (§469(h))"
        ],
        clientExamples: [],
        deliverables: [
          {
            id: "w2_deliv_str",
            title: "STR Tax Strategy Presentation",
            dueDate: "Wed May 13, 2026",
            description: "Walk your Manager through the STR strategy framework end-to-end. Technical, grounded in primary authority, designed so a peer could follow it. Add as task to ClickUp."
          },
          {
            id: "w2_deliv_reps",
            title: "REPS Qualification Presentation",
            dueDate: "Fri May 15, 2026",
            description: "Walk your Manager through REPS qualification end-to-end. Technical, grounded in primary authority. Add as task to ClickUp."
          },
          {
            id: "w2_deliv_assessment",
            title: "Week 2 End-of-Week Assessment",
            dueDate: "Fri May 15, 2026",
            description: "20-question assessment covering §469, STR strategy, and REPS. Honor system: do your best to answer without research. Anyone can look up these answers; what we\u2019re tracking is your understanding right now, what\u2019s solid, and what needs more attention before your presentations. Be honest with yourself. Your scores inform what you focus on next. Mid-week completion is fine."
          }
        ],
        tasks: [],
        resources: [],
        assessment: [
          {
            type: "CONFIDENCE_MCQ", id: "d16_mcq_469_purpose",
            question: "What was the original purpose of IRC §469 (Passive Activity Loss Rules) when enacted in 1986?",
            options: [
              "To prevent tax shelters that allowed wealthy individuals to use real estate losses to offset W-2 income",
              "To encourage real estate investment by allowing all rental losses",
              "To replace the §1031 like-kind exchange rules",
              "To provide tax incentives for first-time homebuyers",
            ],
            correct: 0,
            topicTags: ["passive_loss"],
            difficulty: 2,
            explanation: "§469 was enacted as part of the Tax Reform Act of 1986 specifically to eliminate the abusive 'tax shelter' market. Wealthy individuals were investing in real estate and other partnerships solely to generate paper losses (depreciation, interest) that offset their W-2 / professional income. The new framework defined 'passive activity' broadly (including all rental real estate per se), and limited losses from passive activities to passive income. The exceptions we exploit today (STR loophole, REPS) were carve-outs Congress carved into §469 itself. They're not loopholes, they're statutory exceptions. Understanding the legislative history helps you explain to clients why we have to qualify them so carefully. The IRS scrutinizes these carve-outs because they undo the original 1986 framework.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d16_mcq_469_framework",
            question: "Under IRC §469, a rental activity generates a $30,000 loss for a taxpayer with $250,000 of W-2 income (MFJ). Assuming no special elections or exceptions apply, what happens to the rental loss?",
            options: [
              "Offsets W-2 income dollar for dollar in the current year",
              "Suspended and carried forward — at $250k MAGI the $25k active participation allowance is fully phased out",
              "Offsets up to $25k of active income regardless of MAGI",
              "Permanently disallowed and cannot be used in future years",
            ],
            correct: 1,
            topicTags: ["passive_loss", "suspended_losses"],
            difficulty: 2,
            explanation: "Under §469(c)(2), rental activities are treated as passive activities regardless of whether the taxpayer materially participates. The $25k special allowance under §469(i) for active participation phases out between $100k–$150k MAGI (MFJ). At $250k MAGI, the allowance is zero. The loss is suspended under §469(a) and carries forward indefinitely until (a) future passive income offsets it, or (b) the entire interest in the activity is disposed of in a fully taxable transaction (§469(g)). This is the DEFAULT. The STR strategy and REPS are the two main exceptions that change this outcome.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "w4_mcq_str_reg_cite",
            question: "The STR strategy is built on a regulatory exclusion that says: if average customer use is _____ or less, the activity is NOT a 'rental activity' for §469 passive activity purposes. Which is correct?",
            options: [
              "30 days, under Reg. §1.469-1T(e)(3)(i)",
              "7 days, under Reg. §1.469-1T(e)(3)(ii)(A)",
              "14 days, under §280A",
              "15 days, under Reg. §1.469-2T",
            ],
            correct: 1,
            topicTags: ["str_loophole", "avg_stay_test", "rental_classification"],
            difficulty: 3,
            explanation: "Reg. §1.469-1T(e)(3)(ii)(A) excludes activities with average customer use of 7 days or less from the 'rental activity' definition. There's also a 30-day exception under (e)(3)(ii)(B) that requires significant personal services (a different exception). The 14-day rule from §280A is the personal-use rule for vacation homes (different concept). Always cite the right reg in TSRs. Aiola's clients are sophisticated and the firm's credibility hinges on being precise.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d16_mcq_469g_disposition",
            question: "Under §469(g), what happens to a taxpayer's suspended passive losses on a property when the property is disposed of in a 'fully taxable transaction'?",
            options: [
              "Suspended losses are permanently lost",
              "Suspended losses are released and become deductible against any income (including W-2/active income) in the year of disposition",
              "Suspended losses can only offset future passive income",
              "Suspended losses convert to capital losses",
            ],
            correct: 1,
            topicTags: ["passive_loss", "suspended_losses"],
            difficulty: 4,
            explanation: "§469(g)(1) is the 'release valve.' When a taxpayer disposes of their entire interest in a passive activity in a fully taxable transaction (i.e., to an unrelated party for cash/recognized gain), all previously suspended losses from that activity become fully deductible against any income (passive, active, or portfolio). This is HUGELY important for advisory planning: a client with $200k of suspended losses sitting on a property they're considering selling vs 1031'ing has to weigh the value of releasing those losses now (against ordinary income) vs deferring under 1031 (which keeps the losses suspended). 'Fully taxable' means cash sale, not 1031. A 1031 exchange does NOT trigger §469(g) release. This is the 1031-vs-sale planning conversation.",
          },
          {
            type: "DRAG_EXERCISE", id: "d16_match_469_exceptions",
            title: "§469 Activity Classification Exceptions",
            topicTags: ["passive_loss", "rental_classification", "str_loophole", "avg_stay_test"],
            prompt: "Under Reg. §1.469-1T(e)(3)(ii), there are 6 exceptions where an otherwise rental activity is NOT treated as a 'rental activity' for §469 purposes. Match each exception type to its primary trigger.",
            mode: "match",
            pairs: [
              { a: { id: "e_str", label: "STR exception (Reg. §1.469-1T(e)(3)(ii)(A))" }, b: { id: "t_str", label: "Average customer use ≤ 7 days" } },
              { a: { id: "e_30day", label: "30-day exception (Reg. §1.469-1T(e)(3)(ii)(B))" }, b: { id: "t_30day", label: "Avg use ≤ 30 days AND significant personal services provided" } },
              { a: { id: "e_extraord", label: "Extraordinary services (Reg. §1.469-1T(e)(3)(ii)(C))" }, b: { id: "t_extra", label: "Extraordinary personal services such that rental is incidental (e.g., hospital with patient stays)" } },
              { a: { id: "e_incidental", label: "Incidental rental (Reg. §1.469-1T(e)(3)(ii)(D))" }, b: { id: "t_incidental", label: "Rental of non-rental property (e.g., warehouse rented out occasionally between business uses)" } },
              { a: { id: "e_inv", label: "Activity involving investment (Reg. §1.469-1T(e)(3)(ii)(E))" }, b: { id: "t_inv", label: "Activity not normally rental but customarily made available during defined business hours (golf courses, etc.)" } },
              { a: { id: "e_partner", label: "Partnership/S-Corp incidental rental (Reg. §1.469-1T(e)(3)(ii)(F))" }, b: { id: "t_partner", label: "Property used in non-rental activity of partnership/S-Corp where taxpayer has interest" } },
            ],
            decoys: [],
            explanation: "STR is the most common exception you'll work with, but Aiola advisors should know all 6 because they occasionally apply: a hospitality client (extraordinary services) might be on Schedule C; a client who occasionally rents commercial space they own (incidental) might also qualify. Master the STR exception cold; recognize the others when fact patterns surface them.",
          },
          {
            type: "COMPUTATION", id: "d16_comp_avg_stay_calc",
            title: "Average Customer Use Calculation",
            topicTags: ["str_loophole", "avg_stay_test"],
            prompt: "A client's STR property is rented to 47 separate guests during the year. Total rental days = 287. Compute the 'average period of customer use' for the §1.469-1T(e)(3)(ii)(A) test.",
            expectedAnswer: 6.1,
            tolerance: 0.1,
            unit: "days",
            formLine: "Working paper / time logs",
            workedSolution: [
              "Step 1: Average customer use = Total rental days / Number of separate rentals = 287 / 47 = 6.106... days",
              "Step 2: 6.1 days ≤ 7 days → activity passes the STR test under Reg. §1.469-1T(e)(3)(ii)(A); NOT a rental activity for §469 purposes",
              "Step 3: With material participation, losses become nonpassive. Without MP, losses are still subject to passive treatment but classified differently than a standard rental.",
              "IMPORTANT: 'Days rented' counts only days actually occupied by paying guests. Vacant days do NOT count toward either numerator or denominator. Personal use days do NOT count either (and may invoke §280A vacation home rules separately).",
              "ALSO: Each separate rental = each separate guest stay, not each booking. A 5-day stay by Family Smith is 1 rental; a 3-day stay by Family Jones is another rental. The CALCULATION is total rental days / total rentals.",
            ],
            commonWrongAnswers: [
              { value: 7.8, indicates: "Used 365 total calendar days as numerator (instead of just rented days) divided by 47" },
              { value: 47, indicates: "Confused the test. Average customer use is a per-stay length, not a count of guests." },
              { value: 287, indicates: "Used total days as the answer; the test is the AVERAGE per stay." },
            ],
          },
          {
            type: "CONFIDENCE_MCQ", id: "d17_mcq_str_per_property",
            question: "A client has 3 STR properties (avg stays of 4, 5, and 6 nights respectively). The trainee says: 'Great — STR exception applies to the whole portfolio.' Is this correct?",
            options: [
              "Yes — once a taxpayer has any STR, all rentals on the same return qualify for the exception",
              "No — the STR exception is per-activity. Each property tested separately for both avg-stay AND material participation.",
              "Yes — but only if the client makes the §469(c)(7)(A) aggregation election to combine them",
              "No — only one STR property per taxpayer per year qualifies for the exception",
            ],
            correct: 1,
            topicTags: ["str_loophole", "avg_stay_test", "material_participation_tests"],
            difficulty: 4,
            explanation: "The STR exception is a per-activity test, not a portfolio-wide blanket. Each property must independently meet the avg-stay-≤-7-days test AND have the taxpayer materially participate in THAT property to be nonpassive. With 3 STR properties, the client may meet MP on one (where they spend most of their time) but fail on the others. The §469(c)(7)(A) aggregation election is for REAL ESTATE PROFESSIONALS aggregating their RENTAL ACTIVITIES. It doesn't apply to STR-exception activities (which by definition aren't rental activities under §469). The three STRs aren't 'rental activities' so they can't be aggregated under §1.469-9(g).",
          },
          {
            type: "SCENARIO_BRANCHING", id: "w4_scenario_three_clients",
            title: "The Three-Client Diagnosis",
            topicTags: ["str_loophole", "avg_stay_test", "material_participation_tests", "reps_750hr", "reps_50pct_test", "passive_loss"],
            context: "Three new prospects are on this week's discovery calls. Each owns rental real estate and each wants to know if they can offset W-2 income with rental losses. Walk through each one and identify the right §469 path: STR strategy, REPS qualification, neither, or 'needs more facts.' All three are MFJ.\n\nClient A — DAVID & PRIYA: David is a W-2 anesthesiologist ($420k W-2). Priya doesn't work outside the home. They own one Airbnb in Asheville with average guest stay of 4 nights. Priya manages it directly: bookings, guest comms, hires the cleaner, coordinates repairs — about 180 hours/year. No other rental properties.\n\nClient B — MARCUS: W-2 software engineer ($260k). Owns three long-term rentals (12-month leases) plus one STR (avg 5-night stay). Total rental activity time: roughly 200 hours/year. No real estate W-2 job, no real estate license.\n\nClient C — JENNIFER: Licensed real estate broker with her own brokerage (S-Corp, $180k W-2 from her S-Corp). Spends ~1,400 hours/year on the brokerage. Also owns five long-term rentals; spends ~200 hours/year managing them. No aggregation election filed.",
            decisions: [
              {
                id: "dec1", prompt: "CLIENT A — DAVID & PRIYA: Avg stay 4 nights, Priya 180 hours/year on the property. Which §469 path applies?",
                options: [
                  { text: "STR strategy: avg ≤ 7 days excludes from rental activity classification under Reg. §1.469-1T(e)(3)(ii)(A); Priya's 180 hours likely meets material participation Test 3 (100+ hours AND more than anyone else) — losses are nonpassive against W-2 income", weight: 3, correctness: "great", nextId: "dec2", terminalId: null },
                  { text: "REPS qualification: Priya isn't working W-2, so all her time counts toward REPS", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_a_reps_wrong" },
                  { text: "Standard active participation $25k allowance", weight: 1, correctness: "risky", nextId: null, terminalId: "t_a_25k_wrong" },
                  { text: "Losses are passive and suspended; nothing they can do", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_a_suspended_wrong" },
                ],
              },
              {
                id: "dec2", prompt: "CLIENT B — MARCUS: Three LTRs + one STR, 200 total hours, W-2 software engineer. Which §469 path applies?",
                options: [
                  { text: "STR strategy on the one STR property only (the 3 LTRs remain passive). Marcus's hours on the STR specifically are what matter — verify hours allocated to that property and whether material participation is met for that property alone", weight: 3, correctness: "great", nextId: "dec3", terminalId: null },
                  { text: "REPS qualification: 200 hours of rental activity counts", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_b_reps_wrong" },
                  { text: "STR strategy on all four properties combined", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_b_aggregation_wrong" },
                  { text: "Standard active participation: $25k allowance phased out at $260k AGI anyway, so no benefit", weight: 2, correctness: "acceptable", nextId: null, terminalId: "t_b_partial_credit" },
                ],
              },
              {
                id: "dec3", prompt: "CLIENT C — JENNIFER: Real estate broker, $180k W-2 from her S-Corp, 1,400 brokerage hours, 200 rental hours, 5 LTRs, no aggregation election. Does she qualify for REPS this year?",
                options: [
                  { text: "Yes, both REPS tests met: 1,400 brokerage hours easily exceeds 750, and brokerage (1,400) > non-real-estate W-2 (zero) so >50% test passes. BUT critical caveat: REPS qualifies HER; material participation in each rental still required, OR she files the §469(c)(7)(A) aggregation election under Reg. §1.469-9(g) so 200 hours suffices across all 5 properties. Without aggregation, 200 hrs / 5 = ~40 hrs per property — likely fails MP for each.", weight: 3, correctness: "great", nextId: null, terminalId: "t_great" },
                  { text: "Yes, automatically — she's a real estate broker with 1,400 hours, that's all that matters", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_c_auto_wrong" },
                  { text: "No — her W-2 brokerage hours don't count toward REPS", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_c_w2_wrong" },
                  { text: "Yes for REPS, but the 200 rental hours alone make her materially participate in the rentals without aggregation", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_c_mp_wrong" },
                ],
              },
            ],
            terminals: [
              { id: "t_great", label: "Master-Level §469 Diagnosis", outcome: "great", coachingNote: "This is the level your Manager wants you operating at within 60 days. Three teaching points: (1) STR strategy hinges on TWO things: avg stay ≤ 7 days AND material participation; both required. (2) The STR exception under Reg. §1.469-1T(e)(3)(ii)(A) is per-activity, not portfolio-wide. (3) REPS qualifies the TAXPAYER, but each rental still requires material participation (or the aggregation election). The aggregation election under Reg. §1.469-9(g) is the unlock for clients like Jennifer with multiple smaller rentals. Without it, hours scattered across properties may not hit MP on any single one. Note: aggregation, once made, is binding until revoked with IRS consent. Don't recommend it lightly. Note specifically: Jennifer's 1,400 brokerage hours count toward the REPS tests because she owns 100% of her brokerage S-Corp, well over the 5% threshold in §469(c)(7)(D)(ii). A W-2 leasing manager at an unaffiliated REIT would NOT have those hours count." },
              { id: "t_a_reps_wrong", label: "REPS-Misapplied", outcome: "harmful", coachingNote: "REPS isn't the right tool for Priya, and even if it were, she'd need >750 hours in real property trades, not just 'no W-2 job.' The STR strategy is far simpler and cleaner here: avg stay ≤ 7 days excludes the activity from passive classification, material participation makes the loss nonpassive. No need to invoke REPS. Don't reach for the more complex tool when the simpler one works." },
              { id: "t_a_25k_wrong", label: "$25k Allowance Wrong Tool", outcome: "risky", coachingNote: "$25k active participation allowance phases out fully at $150k MAGI MFJ. David & Priya's $420k W-2 income alone blows past that. The allowance is zero. Plus, the allowance is for properties classified as 'rental activity' under §469. A property with avg stay ≤ 7 days is NOT a rental activity for §469 purposes. It falls under the activity-exclusion under Reg. §1.469-1T(e)(3)(ii)(A). The right tool is the STR strategy, not the §469(i) allowance." },
              { id: "t_a_suspended_wrong", label: "Premature Surrender", outcome: "harmful", coachingNote: "Defaulting to 'losses are suspended' on a 4-night-average-stay rental is leaving the entire STR strategy on the table, typically $30k–$80k+ of W-2 offset for clients in this profile. This is malpractice-by-omission territory. Always check the avg stay test before assuming passive treatment." },
              { id: "t_b_reps_wrong", label: "Confusing Hours With REPS", outcome: "harmful", coachingNote: "REPS requires >750 hours in real property trades or businesses AND >50% of total personal services in those trades. Marcus has a full-time W-2 software job (~2,000 hours) and only 200 rental hours. He fails both tests by miles. Don't conflate 'time spent on rentals' with REPS qualification." },
              { id: "t_b_aggregation_wrong", label: "Aggregation Misuse", outcome: "harmful", coachingNote: "The aggregation election under §469(c)(7)(A) is for REAL ESTATE PROFESSIONALS to aggregate rentals for material participation purposes, not for combining LTRs and STRs to qualify for the STR exception. The STR exception applies on a per-activity basis. Marcus's three LTRs stay passive regardless. Only the one STR can potentially qualify for nonpassive treatment, and only if Marcus materially participates in that specific property." },
              { id: "t_b_partial_credit", label: "Partial Credit", outcome: "acceptable", coachingNote: "You're right that the $25k allowance is phased out at $260k AGI, fully eliminated above $150k MFJ. But you missed the bigger play: the one STR property might qualify for nonpassive treatment via the avg-stay-≤-7-days exception. Check Marcus's hours on that specific property and whether MP is met. Even one property's worth of nonpassive losses can move the needle." },
              { id: "t_c_auto_wrong", label: "Skipped Material Participation", outcome: "harmful", coachingNote: "REPS qualifies the TAXPAYER, but each rental property still needs material participation to be nonpassive. Without the aggregation election under Reg. §1.469-9(g), Jennifer would need to materially participate in EACH of her 5 rentals separately. 200 hours / 5 properties = 40 hours/property, well below the 100-hour and 500-hour MP thresholds. The aggregation election is the unlock here. Without it, she's a real estate professional whose rental losses are still passive." },
              { id: "t_c_w2_wrong", label: "W-2 Disqualifier Misapplied", outcome: "harmful", coachingNote: "The §469(c)(7)(D)(ii) W-2 disqualifier applies when a taxpayer is a W-2 employee in a real property trade or business AND owns less than 5% of the employer. Jennifer owns her own S-Corp brokerage. She's the owner, so the W-2 disqualifier doesn't apply. Her brokerage hours absolutely count toward REPS. The disqualifier is for situations like a rank-and-file W-2 employee at a big developer or property management company." },
              { id: "t_c_mp_wrong", label: "MP Math Wrong", outcome: "harmful", coachingNote: "200 rental hours spread across 5 properties = ~40 hours per property. None of the 7 material participation tests are met at 40 hours per activity. Test 1 requires 500 hours; Test 3 requires 100 hours AND more than anyone else; Test 4 requires significant participation activities (100+ hrs each and 500 total in aggregate of significant participation activities). Without aggregation, Jennifer's rentals stay passive even though she's a qualifying real estate professional. The aggregation election fixes this. Combining hours, 200 hours easily exceeds 500-hour Test 1 in the aggregated activity. THIS is the unlock." },
            ],
          },
          {
            type: "DRAG_EXERCISE", id: "w4_order_mp_tests",
            title: "The 7 Material Participation Tests",
            topicTags: ["material_participation_tests", "mp_500hr", "mp_100hr_more_than_anyone", "mp_aggregation"],
            prompt: "Drag the 7 material participation tests under Reg. §1.469-5T(a) into the order they appear in the regulation. (You'll cite these by number in TSRs and client memos.)",
            mode: "order",
            items: [
              { id: "mp1", label: "More than 500 hours in the activity during the year" },
              { id: "mp2", label: "Substantially all participation in the activity (i.e., taxpayer is the only one who participates meaningfully)" },
              { id: "mp3", label: "More than 100 hours AND not less than any other individual's participation" },
              { id: "mp4", label: "Significant participation activities (SPA): 100+ hours in this activity, and 500+ hours total across all SPAs" },
              { id: "mp5", label: "Material participation in 5 of the prior 10 tax years" },
              { id: "mp6", label: "Personal service activity: material participation in any 3 prior years (for personal service activities only)" },
              { id: "mp7", label: "Facts and circumstances: regular, continuous, and substantial participation (≥100 hours required)" },
            ],
            correctSequence: ["mp1", "mp2", "mp3", "mp4", "mp5", "mp6", "mp7"],
            explanation: "Reg. §1.469-5T(a) lists these in this order. In practice for real estate clients, Tests 1, 3, and 7 do most of the work. Test 1 (500+ hours) is the cleanest. Pass it and you're done. Test 3 (100+ AND more than anyone else) is the typical STR strategy test for couples where one spouse manages the property. Test 7 (facts and circumstances ≥ 100 hours) is the fallback when records are imperfect, but the IRS scrutinizes it heavily. Test 4 (significant participation activities) rarely applies to real estate. Tests 5/6 require historical participation patterns. Always document hours contemporaneously. Courts have rejected 'reconstructed' time logs.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d18_mcq_test1_vs_test3",
            question: "A client and spouse jointly own an STR. Each spouse works on the property — wife does 250 hours, husband does 75 hours. The cleaning crew does 30 hours. Does either spouse meet material participation under Reg. §1.469-5T(a)?",
            options: [
              "Wife meets Test 3 (more than 100 AND more than anyone else); husband does not",
              "Both spouses qualify because they're MFJ",
              "Neither qualifies — neither hits 500 hours",
              "Husband qualifies because he's the secondary spouse",
            ],
            correct: 0,
            topicTags: ["material_participation_tests", "mp_500hr", "mp_100hr_more_than_anyone"],
            difficulty: 5,
            explanation: "Per §469(h)(5), spouses' hours combine for material participation analysis on a joint return. Combined spousal hours: 250 + 75 = 325. The cleaning crew at 30 hours is the only other participant. Test 3 (more than 100 hours AND not less than any other individual's participation) is met by the combined spousal participation. The activity is nonpassive. Practical takeaway: spouses don't need to qualify individually on a joint return; combined hours run through the same 7 tests. Documentation must still distinguish each spouse's hours for IRS substantiation purposes.",
            citation: "§469(h)(5), Reg. §1.469-5T(a)",
          },
          {
            type: "CONFIDENCE_MCQ", id: "w4_mcq_substantial_vs_hotel",
            question: "A client has an Airbnb with avg guest stay of 5 nights. They provide WiFi, basic cleaning between guests, and a welcome basket. They materially participate. How is the activity treated?",
            options: [
              "Schedule C, with SE tax — because 'substantial services' makes it an active business",
              "Schedule E, nonpassive — because avg stay ≤ 7 days excludes from rental activity classification, MP makes loss nonpassive; substantial services for SCHEDULE PURPOSES (Reg. §1.1402(a)-4) requires a higher threshold (daily housekeeping, meals, concierge) that this client does NOT meet",
              "Schedule E, passive — short-term rentals are still rentals",
              "Form 4835 — farm rental income",
            ],
            correct: 1,
            topicTags: ["str_loophole", "schedule_e_vs_c", "substantial_services", "rental_classification"],
            difficulty: 5,
            explanation: "TWO DIFFERENT TESTS at TWO DIFFERENT THRESHOLDS. This is the most common conceptual error. (1) The §469 'rental activity' exclusion (Reg. §1.469-1T(e)(3)(ii)(A)) uses a 7-day average customer use threshold to determine passive classification. (2) The Schedule C / SE tax test (Reg. §1.1402(a)-4 + Pub 527) uses a 'substantial services' standard: services 'similar to those rendered by a hotel' (daily maid service, meals, concierge). Most STRs meet the 7-day test (so they escape passive treatment) but DO NOT meet the substantial services test (so they stay on Schedule E, no SE tax). WiFi + turnover cleaning + welcome basket is NOT substantial services. The activity is correctly: Schedule E + nonpassive (because of MP) + no SE tax. Memorize this distinction. Many CPAs (and online articles) conflate these.",
          },
          {
            type: "COMPUTATION", id: "w4_comp_str_savings",
            title: "STR Strategy — Estimated Tax Savings",
            topicTags: ["str_loophole", "passive_loss"],
            prompt: "Client profile: MFJ, $400,000 combined W-2 income, no other entities. Acquired one STR for $700,000 (allocated $150k to land, $550k to building). Avg guest stay 4 nights. Cost segregation study yields $180,000 of bonus depreciation in year 1. Operating loss before depreciation: $5,000. Spouse who is not employed manages the STR — 220 hours documented. Federal marginal rate: 32%. Compute the approximate FEDERAL income tax savings in year 1 from the STR strategy. (Ignore state, NIIT, and AMT for this problem.)",
            expectedAnswer: 59200,
            tolerance: 200,
            unit: "dollars",
            formLine: "Form 1040 + Schedule E + Form 4562",
            workedSolution: [
              "Step 1: Verify STR exception applies. Avg guest stay 4 nights ≤ 7 → activity is excluded from 'rental activity' classification under Reg. §1.469-1T(e)(3)(ii)(A).",
              "Step 2: Verify material participation. Spouse: 220 documented hours. Likely meets Test 3 (100+ hours AND more than any other individual, assuming nobody else has >220 hrs on this property). MP = yes.",
              "Step 3: Compute year-1 loss. Operating loss $5,000 + depreciation $180,000 = $185,000 net loss on Schedule E.",
              "Step 4: Loss is nonpassive (because: STR exception + MP). It offsets W-2 income.",
              "Step 5: Tax savings ≈ $185,000 × 32% = $59,200.",
              "Important caveats not in this calc: (a) NIIT impact: STR rentals classified as nonpassive trade-or-business may avoid NIIT (3.8%) on positive income years. (b) Eventual depreciation recapture (§1245/§1250) on sale. (c) State tax savings on top. (d) §199A QBI may apply if the activity is a §162 trade or business, but loss years don't generate QBI deduction. (e) Strategy requires CONTEMPORANEOUS hour logs. Reconstructed records lose in audit. (f) The MP test is per-year. Year 2's status depends on Year 2's hours.",
              "This is the conversation you walk a client through before recommending. The headline number is $59k. The asterisks are what protect the client from over-relying on the strategy.",
              "Note: This assumes the full $185,000 loss is absorbed at the 32% marginal rate. In reality, removing $185k from $400k W-2 income moves part of it into a lower bracket (24% kicks in at $383,900 MFJ for 2024), so actual savings may be ~$57-58k. The 32% figure is the simplifying assumption for this question; real-world planning should use a tax projection.",
            ],
            commonWrongAnswers: [
              { value: 60800, indicates: "Used 32.85% (avg of 32 and 33.85). Stick to the stated 32% marginal." },
              { value: 6800, indicates: "Forgot to add depreciation to operating loss." },
              { value: 0, indicates: "Assumed losses are passive, but this client meets BOTH the STR exception and MP." },
              { value: 8000, indicates: "Applied $25k cap. That's the active participation allowance, not relevant here. STR exception bypasses §469 passive treatment entirely." },
            ],
          },
          {
            type: "SCENARIO_BRANCHING", id: "d18_scenario_mp_qualification",
            title: "Qualifying Material Participation — Time Log Reality Check",
            topicTags: ["material_participation_tests", "mp_500hr", "mp_100hr_more_than_anyone"],
            context: "A new advisory client (W-2 dentist, $480k AGI MFJ) is closing on a $1.2M STR in Sedona on March 1. They tell you: 'My wife is going to manage it. She doesn't work right now. We expect she'll spend \"a lot\" of time on the property.' How do you scope material participation expectations BEFORE the close?",
            decisions: [
              {
                id: "dec1", prompt: "What's the FIRST thing you tell the client?",
                options: [
                  { text: "'You're set — STR + spouse manages = automatic MP'", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_no_documentation" },
                  { text: "'Material participation is a per-year, fact-based test. Your wife needs to either (a) spend 500+ hours on this property [Test 1], or (b) spend 100+ hours AND more than anyone else including the cleaning crew [Test 3]. Both require contemporaneous documentation. Without time logs, you don't qualify even if she actually puts in the hours.'", weight: 3, correctness: "great", nextId: "dec2", terminalId: null },
                  { text: "'Just spend 100 hours; that's enough'", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_partial_test3" },
                  { text: "'Hire a property manager so it's hands-off'", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_kills_strategy" },
                ],
              },
              {
                id: "dec2", prompt: "Client asks: 'How do we document hours? She's not going to log every minute.'",
                options: [
                  { text: "Recommend a cheap time-tracking system (Toggl, RealEstateLogger, even a Google Sheet) with daily entries: date, hours, task, notes. Track guest communications, cleaning crew coordination, repair management, accounting/booking management, marketing, property maintenance, etc. The IRS has rejected 'reconstructed' logs in cases like Goshorn v. Comm. — contemporaneous matters. Document EVERYTHING from day 1 of the rental year.", weight: 3, correctness: "great", nextId: "dec3", terminalId: null },
                  { text: "'Just write down 500 hours at year end'", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_reconstructed" },
                  { text: "'You don't need to document anything — the IRS rarely audits this'", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_audit_blind" },
                ],
              },
              {
                id: "dec3", prompt: "Client says: 'OK she'll log everything. What about our cleaning crew? They spend ~60 hrs/year on the property.'",
                options: [
                  { text: "Critical detail. Test 3 (the typical STR test) requires the taxpayer's hours > anyone else's. If the cleaner is at 60 hours, your wife needs to be at MORE THAN 60 — but she also needs ≥ 100 to satisfy Test 3 entirely. So the practical bar is 'more than 100 AND more than the cleaner.' If she's at 90 hours and cleaner is at 60, she fails Test 3. She'd need either 500+ hours (Test 1) or 100+ AND > cleaner (which she doesn't meet at 90). This is why 100 hours alone isn't always enough.", weight: 3, correctness: "great", nextId: null, terminalId: "t_great" },
                  { text: "Cleaner hours don't count — only owner hours matter", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_audit_blind" },
                  { text: "Hire the cleaner as an employee so their hours don't count separately", weight: 1, correctness: "risky", nextId: null, terminalId: "t_partial" },
                ],
              },
            ],
            terminals: [
              { id: "t_great", label: "Pro MP Qualification Conversation", outcome: "great", coachingNote: "Three teaching points: (1) MP is a per-year test. Every year stands alone. A client who qualifies in 2024 must re-qualify in 2025. (2) Test 3 has TWO requirements: 100+ hours AND more than anyone else's hours. Many trainees forget the second part. (3) Documentation lives or dies in court. Contemporaneous logs win, reconstructed logs lose. The Aiola process: set the client up with a logging system on day 1 of the rental year, not at tax time. This conversation is the difference between successful STR strategy and audit failure." },
              { id: "t_no_documentation", label: "No Documentation Setup", outcome: "harmful", coachingNote: "Telling a client they automatically qualify without checking facts AND setting up documentation is malpractice-territory. STR strategy with no time logs = $50k+ tax savings on year 1, then audit reclassification 18 months later = penalties + interest + reputational damage to firm. Always set up documentation upfront." },
              { id: "t_partial_test3", label: "Test 3 Math Wrong", outcome: "harmful", coachingNote: "Test 3 requires '100+ hours AND not less than any other individual.' The 'AND' is critical. If the cleaning crew is at 120 hours and the owner is at 110, Test 3 fails despite owner hitting 100. Fall back to Test 1 (500+) or Test 7 (facts and circumstances ≥ 100, regular/continuous/substantial). Never tell a client '100 hours is enough' without checking the comparator." },
              { id: "t_kills_strategy", label: "Strategy Killed", outcome: "harmful", coachingNote: "Hiring a full-time property manager almost always KILLS material participation. The manager will exceed any owner's hours, failing Test 3. Property manager + owner can sometimes work if Test 1 (500+ hours) is met, but that's rare for owners with day jobs. The clean STR strategy plays: spouse manages directly, or owner self-manages. Property managers are often a yellow flag for §469 qualification." },
              { id: "t_reconstructed", label: "Reconstructed Logs", outcome: "harmful", coachingNote: "The Goshorn case (Goshorn v. Commissioner, T.C. Memo 1993-578) and others have rejected 'reconstructed' time logs assembled at year-end or pre-audit. Courts look for contemporaneous (created at the time) records. Reconstructed logs are presumed less reliable. The Aiola standard: weekly contemporaneous entries minimum." },
              { id: "t_audit_blind", label: "Audit Blind", outcome: "harmful", coachingNote: "STR strategy generates large W-2 offsets, exactly the kind of claim that triggers IRS scrutiny under their compliance project guidance. Audit rates on §469 nonpassive claims are meaningfully higher than baseline. Telling a client 'they rarely audit' is wrong factually and ethically." },
              { id: "t_partial", label: "Partial Credit", outcome: "risky", coachingNote: "Hiring the cleaner as a W-2 employee doesn't change MP analysis under §469. Employee hours of OTHER PEOPLE still count toward the 'more than anyone else' comparison in Test 3. The MP test is about the TAXPAYER'S hours vs anyone else's, regardless of employment relationship. Don't try to engineer around the test by changing employment status." },
            ],
          },
          {
            type: "CONFIDENCE_MCQ", id: "w4_mcq_reps_two_part",
            question: "To qualify as a Real Estate Professional under §469(c)(7), a taxpayer must meet:",
            options: [
              "More than 750 hours in real property trades or businesses, only",
              "More than 50% of personal services in real property trades, only",
              "Both: more than 50% of personal services AND more than 750 hours in real property trades",
              "Either: 750 hours OR 50% of services, whichever is met first",
            ],
            correct: 2,
            topicTags: ["reps_750hr", "reps_50pct_test"],
            difficulty: 3,
            explanation: "Both tests, both met. §469(c)(7)(B) requires (i) more than half of personal services in real property trades or businesses in which the taxpayer materially participates, AND (ii) more than 750 hours of services performed in those trades. The 50% test alone fails clients with significant non-real-estate work. The 750-hour test alone fails clients who have a full-time non-real-estate job and dabble in real estate. Both required. Spouses qualify independently. Only one spouse needs REPS for a joint return. Common error: counting hours toward REPS that don't qualify (e.g., investor activities like reading market reports, looking at properties to buy, those don't count under §469(c)(7)(C)).",
          },
          {
            type: "CONFIDENCE_MCQ", id: "w4_mcq_w2_disqualifier",
            question: "A client works full-time as a W-2 leasing manager at a large apartment REIT. They want to count their 2,200 work hours toward the REPS 750-hour test. Can they?",
            options: [
              "Yes — leasing is a real property trade or business",
              "Yes, but only 50% of the hours count",
              "No — under §469(c)(7)(D)(ii), W-2 employee hours don't count toward REPS unless the employee owns at least 5% of the employer",
              "Yes, automatically — REIT employees always qualify",
            ],
            correct: 2,
            topicTags: ["reps_750hr", "w2_real_estate_employee"],
            difficulty: 3,
            explanation: "§469(c)(7)(D)(ii) says personal services performed as a W-2 employee don't count as services in a real property trade or business UNLESS the employee owns at least 5% of the employer. A leasing manager at a large REIT is a W-2 employee with no meaningful equity. Those hours do NOT count toward REPS. This is a common qualification trap. Counter-example: an owner-operator of a real estate brokerage who takes a W-2 from their own S-Corp owns 100%. Those W-2 hours absolutely count. The key question is always: does the taxpayer own ≥5% of the employer?",
          },
          {
            type: "CONFIDENCE_MCQ", id: "w4_mcq_reps_per_property",
            question: "Once a taxpayer qualifies as a Real Estate Professional, are all their rental losses automatically nonpassive?",
            options: [
              "Yes — REPS automatically converts all rental losses to nonpassive",
              "No — REPS qualifies the taxpayer; material participation per property still required absent aggregation election",
              "Yes — but only for short-term rentals owned by REPS qualifiers",
              "Only if all rentals are titled in a single LLC or aggregated entity",
            ],
            correct: 1,
            topicTags: ["reps_750hr", "reps_aggregation_election", "material_participation_tests", "mp_aggregation"],
            difficulty: 4,
            explanation: "This is the most commonly missed nuance. §469(c)(7) qualifies the TAXPAYER as a real estate professional, meaning rental activities are no longer per-se passive. But each rental activity is still subject to the material participation test SEPARATELY unless the taxpayer makes the aggregation election under §469(c)(7)(A) (regulations at Reg. §1.469-9(g)). Without aggregation, hours scattered across multiple properties often fail MP on each one individually. The election treats all rentals as one activity for MP testing, usually the right move for REPS clients with multiple properties. Caveat: aggregation is binding once made; revocation requires IRS consent (Reg. §1.469-9(g)(3)).",
          },
          {
            type: "COMPUTATION", id: "d19_comp_reps_50pct",
            title: "REPS 50% Test Calculation",
            topicTags: ["reps_750hr", "reps_50pct_test"],
            prompt: "Client (MFJ) profile for 2024: Wife works W-2 as a registered nurse — 1,820 hours. Husband owns and operates a real estate brokerage (S-Corp he owns 100%) — 1,600 hours of brokerage work. Husband also owns 4 rental properties, spending 280 hours/year managing them. How many people in this household qualify as a Real Estate Professional under §469(c)(7)? Enter 0, 1, or 2.",
            expectedAnswer: 1,
            tolerance: 0,
            unit: "number",
            formLine: "Time logs + REPS qualification memo",
            workedSolution: [
              "Step 1: REPS test under §469(c)(7)(B) requires BOTH (i) >50% of personal services in real property trades or businesses AND (ii) >750 hours in those trades.",
              "Step 2: Wife: 1,820 hours nursing (NOT a real property trade) + 0 real property hours. Fails both tests.",
              "Step 3: Husband: 1,600 hours brokerage (real property trade, yes; he's owner of his S-Corp so W-2 disqualifier under §469(c)(7)(D)(ii) does NOT apply, since he owns >5%) + 280 hours rentals (real property trade).",
              "Step 4: Husband total real property hours = 1,600 + 280 = 1,880",
              "Step 5: Husband total personal services = 1,880 (no other personal service hours mentioned)",
              "Step 6: 50% test: 1,880 / 1,880 = 100% > 50% ✓",
              "Step 7: 750-hour test: 1,880 > 750 ✓",
              "Step 8: Husband qualifies as REPS. Answer: 1 (only the husband qualifies). Wife does NOT.",
              "IMPORTANT: For MFJ, only ONE spouse needs to qualify as REPS for it to apply to the joint return. So this couple has REPS via husband. BUT: REPS qualification only removes the 'per se passive' label from rental activities. Each rental still needs material participation (or aggregation election). Husband has 280 rental hours / 4 properties = ~70 hours per property. Without aggregation, no property meets MP individually. Husband should make the aggregation election to combine the 280 hours across all 4 rentals as a single activity.",
            ],
            commonWrongAnswers: [
              { value: 0, indicates: "Forgot the husband qualifies. Concluded neither based on missing the >5% ownership exception." },
              { value: 2, indicates: "Counted the wife, but nursing is not a real property trade or business under §469(c)(7)(C)." },
            ],
          },
          {
            type: "SCENARIO_BRANCHING", id: "d19_scenario_aggregation_decision",
            title: "Aggregation Election: Run the Math First",
            topicTags: ["reps_aggregation_election", "mp_aggregation"],
            context: "REPS-qualified client has 6 rental properties: 3 long-term rentals he's held for 8 years (all profitable, each generating ~$8k positive income) and 3 newly acquired short-term rentals (heavily leveraged, expected $40k loss each in 2024). He spent 80 hours/year on each LTR (240 total) and 40 hours/year on each STR (120 total). Total real estate hours: 360. He asks about the §469(c)(7)(A) aggregation election. Walk the math.",
            decisions: [
              {
                id: "dec1", prompt: "First analytical step?",
                options: [
                  { text: "Recommend aggregation immediately — 360 hours combined easily clears MP", weight: 1, correctness: "risky", nextId: null, terminalId: "t_premature" },
                  { text: "Run BOTH scenarios. WITHOUT aggregation: each LTR (80hr) fails MP, each STR (40hr) also fails MP — losses are passive, suspended. WITH aggregation: 360 hours combined as one activity — Test 1 (500hr) fails (only 360), but Test 7 (facts and circumstances >100) likely passes. All 6 properties become one nonpassive activity — but this includes the 3 LTRs.", weight: 3, correctness: "great", nextId: "dec2", terminalId: null },
                  { text: "Recommend against aggregation — too binding", weight: 1, correctness: "risky", nextId: null, terminalId: "t_premature_no" },
                  { text: "Tell him to consult his attorney", weight: 1, correctness: "risky", nextId: null, terminalId: "t_deflect" },
                ],
              },
              {
                id: "dec2", prompt: "Math check: with aggregation, $120k STR losses + $24k LTR positive income = net $96k loss against W-2. Without: $0 net loss because LTRs and STRs both fail MP. Aggregation is clearly better THIS YEAR. What's the key consideration before electing?",
                options: [
                  { text: "Election is binding on all future years until revoked with IRS consent (Reg. §1.469-9(g)(3)). Imagine selling one of the LTRs in 5 years for a loss — that loss is treated as part of the AGGREGATED activity. To release any suspended losses on disposition under §469(g), the client would need to dispose of 'substantially all' of the aggregated activity, not just one property. So aggregation creates exit complications.", weight: 3, correctness: "great", nextId: "dec3", terminalId: null },
                  { text: "No future complications — election can be revoked anytime", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_undersell_binding" },
                  { text: "Just file Form 1031 with the election", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_wrong_form" },
                ],
              },
              {
                id: "dec3", prompt: "Recommendation?",
                options: [
                  { text: "Recommend aggregation election if client plans to hold ALL properties long-term and use rental losses against W-2 income. Document the binding nature explicitly in the engagement memo. If client has any property he intends to dispose of in next 3-5 years, run the disposition scenario both ways and consider whether a different structure (separate LLCs per property, no aggregation) would be cleaner.", weight: 3, correctness: "great", nextId: null, terminalId: "t_great" },
                  { text: "Just elect — current year benefit overrides future considerations", weight: 1, correctness: "risky", nextId: null, terminalId: "t_short_term" },
                  { text: "Don't elect — aggregation is too risky", weight: 1, correctness: "risky", nextId: null, terminalId: "t_overcautious" },
                ],
              },
            ],
            terminals: [
              { id: "t_great", label: "Pro Aggregation Conversation", outcome: "great", coachingNote: "Three teaching points: (1) Run the math BOTH ways before recommending: current year + future-year scenarios with disposition. (2) Aggregation election is binding under §1.469-9(g)(3). Revocation requires IRS consent except in narrow material-change cases. (3) The §469(g) suspended-loss release on disposition is at the AGGREGATED activity level after election, meaning client can't 'cherry-pick' loss release on one property if aggregated. Ideal aggregation candidate: REPS client with multiple properties, long-term hold strategy, no near-term disposition plans. Specifically: with aggregation in place, if he later sells ONE LTR for cash gain, §469(g) suspended-loss release does NOT trigger because he hasn't disposed of 'substantially all' of the aggregated activity. Suspended losses stay locked until aggregate disposition." },
              { id: "t_premature", label: "Premature Recommendation", outcome: "risky", coachingNote: "Aggregation is rarely the wrong call for a REPS client with multiple smaller properties, but always run the math first. The binding nature can come back to bite if client's holding plans change." },
              { id: "t_premature_no", label: "Overcautious", outcome: "risky", coachingNote: "Failing to recommend aggregation when the math clearly works leaves a $96k loss on the table THIS year. The binding nature is a real consideration but not a reason to default to 'no.' Run both scenarios; recommend based on facts." },
              { id: "t_deflect", label: "Pure Deflection", outcome: "risky", coachingNote: "The aggregation election is squarely a tax/CPA conversation. Attorneys handle entity formation; CPAs handle elections. Don't punt." },
              { id: "t_undersell_binding", label: "Undersold the Binding Nature", outcome: "harmful", coachingNote: "Reg. §1.469-9(g)(3) requires IRS consent to revoke aggregation except in narrow circumstances (material change in facts and circumstances). Telling the client 'we can revoke anytime' is wrong and could expose the firm to malpractice if they later need to revoke and can't." },
              { id: "t_wrong_form", label: "Wrong Form", outcome: "harmful", coachingNote: "The aggregation election is filed by attaching a STATEMENT to the timely-filed return; it's not a separate form. The statement requires specific language under Reg. §1.469-9(g)(3). Form 1031 is for like-kind exchanges (Form 8824 in fact)." },
              { id: "t_short_term", label: "Short-Term Thinking", outcome: "risky", coachingNote: "Always factor disposition planning into aggregation decisions. A client who plans to 1031 one property next year but aggregates today loses the ability to release suspended losses on that one property under §469(g). They'd have to dispose of substantially all the aggregated activity to trigger the release." },
              { id: "t_overcautious", label: "Overcautious", outcome: "risky", coachingNote: "Aggregation isn't 'too risky' as a default. For the right client (long-term hold REPS), it's the optimal play. Don't default to 'no' on complex elections; do the analysis." },
            ],
          },
          {
            type: "CONFIDENCE_MCQ", id: "w4_mcq_aggregation",
            question: "A real estate professional client wants to make the §469(c)(7)(A) aggregation election. Which statement is most accurate?",
            options: [
              "It's an annual election — file each year you want it to apply to that year",
              "Filed by attaching a statement to a timely return; binding until revoked with IRS consent",
              "It's automatic for any taxpayer who qualifies as a Real Estate Professional",
              "Can only be made in the first year the taxpayer acquires rental real estate",
            ],
            correct: 1,
            topicTags: ["reps_aggregation_election", "mp_aggregation"],
            difficulty: 4,
            explanation: "The aggregation election under §469(c)(7)(A) is made by attaching a statement to the timely-filed (including extensions) original return for the year of the election. It's NOT automatic. Once made, it's binding for that year and ALL FUTURE YEARS until revoked, and revocation requires IRS consent except in narrow cases (material change in facts, per Reg. §1.469-9(g)(3)). This is why Aiola's process is: don't recommend aggregation lightly. Run the math both ways before electing. For some clients, aggregating helps THIS year but hurts in a future year (e.g., a future property sold at a loss where you'd want it treated as a separate activity for §469(g) suspended-loss release). The decision is irreversible without IRS pain.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d10_mcq_active_vs_material",
            question: "ACTIVE participation (qualifying for the $25k allowance) and MATERIAL participation (qualifying for nonpassive treatment) — what's the difference?",
            options: [
              "They're the same standard with different names used interchangeably",
              "Active is a lower bar (management decisions, no hour test, for $25k allowance); material requires one of seven specific tests under Reg §1.469-5T(a) for nonpassive treatment",
              "Active requires 750 hours per year; material requires only 500 hours",
              "Material participation applies only to STR; active participation applies only to LTR",
            ],
            correct: 1,
            topicTags: ["passive_loss", "special_25k_allowance", "material_participation_tests"],
            difficulty: 4,
            explanation: "Critical distinction. Active participation (per §469(i)(6)) is a much lower bar: making bona fide management decisions (approving tenants, setting rent, hiring contractors). It does NOT require any specific hours. It qualifies the rental for the $25k special allowance with phase-out. Material participation (per Reg. §1.469-5T(a)) requires meeting one of 7 specific tests (covered earlier this week (Material Participation Tests). It qualifies the activity as NONPASSIVE, meaning losses are unlimited against W-2/active income (subject to the activity NOT being a per-se rental activity, which is where the STR exception comes in). New advisors often use these terms interchangeably. They shouldn't.",
          },
        ],
      },
    ],
  },
  {
    id: "week3", label: "Week 3", subtitle: "Schedule E + Depreciation + Cost Segregation", phase: "Days 1–30",
    items: [
      {
        id: "week3_main",
        title: "Week 3 \u2014 Schedule E + Depreciation + Cost Segregation",
        description: "This week you build the technical foundation for real-property advisory work: Schedule E line-by-line, defensible basis allocation between land and building, MACRS recovery period classification across 5, 15, 27.5, and 39-year buckets, IRC \u00a7168(k) bonus depreciation, improvements versus repairs under Reg \u00a71.263(a)-3, and cost segregation fundamentals. By end of week you have three deliverables: a Wednesday Property Research, Basis Allocation and Depreciation Schedule presentation walking your Manager through methodology applied to an assigned real property; a Friday Schedule E review presentation that flags every issue across an assigned client\u2019s full Schedule E and identifies where Week 2 strategies apply; and a 20-question end-of-week assessment covering Schedule E mechanics, MACRS classification, improvements versus repairs, the \u00a7469(i) $25,000 active-participation allowance, and cost segregation. Both presentations must be technical, grounded in primary authority, with citations to IRC \u00a7168, \u00a7168(k), \u00a7263(a), \u00a7469(i), Pubs 527 and 946, the IRS Cost Segregation Audit Technique Guide, and Reg \u00a71.263(a)-3.",
        topicTags: [
          "schedule_e", "rental_classification", "form_1040", "depreciation",
          "basis", "cost_seg_basics", "bonus_depreciation", "case_law",
          "passive_loss", "special_25k_allowance"
        ],
        weeklyRubric: {
          title: "Week 3 Scorecard",
          intro: "This rubric applies to BOTH your Wednesday Property Research presentation AND your Friday Schedule E Review presentation. Pressure-test your own work against it before delivering.",
          categories: [
            { num: 1, name: "Technical Accuracy", desc: "Rules, recovery periods, conventions, and exception classifications stated correctly. No doctrinal errors on \u00a7168, \u00a7168(k), \u00a7263(a), or \u00a7469(i)." },
            { num: 2, name: "Methodology & Source Defensibility", desc: "County assessor records, comparable sales, and GIS records pulled and cited. Aiola Property Research Methodology followed. Override decisions documented when made. Working paper would survive review under Meiers v. Commissioner." },
            { num: 3, name: "Calculation Accuracy", desc: "Basis allocation math correct. MACRS recovery period assignments correct. Year-1 depreciation correct with and without cost seg. Bonus depreciation overlay applied correctly. Math is auditable from inputs to output." },
            { num: 4, name: "Coverage & Completeness", desc: "All Schedule E lines addressed. Improvement vs repair calls made. Component classifications complete. Strategy opportunities from Week 2 flagged where they apply." },
            { num: 5, name: "Communication & Defensibility", desc: "Peer can follow it from the deck alone. Holds up under Q&A. Substance could be delivered to a client with tone adjustment." }
          ],
          banding: "Each category scored 1\u20134. Total: 20. 17\u201320 Mastery (pass) \u00b7 14\u201316 Proficient (pass) \u00b7 11\u201313 Developing (conditional pass with re-work) \u00b7 \u226410 Below Bar.",
          fullDocLink: "/scorecard-week3.html",
          fullDocLabel: "View Full Scorecard"
        },
        learningObjectives: [
          "Read Schedule E line-by-line and identify every input that flows to each line (Pub 527, Schedule E instructions)",
          "Apply the Aiola Property Research Methodology to allocate a property\u2019s purchase price between land and building. Default to the county assessor ratio; override only with documented evidence",
          "Classify property components into MACRS recovery period buckets: 5-year personal property under \u00a7168(e)(3)(B), 15-year land improvements under \u00a7168(e)(3)(E), 27.5-year residential rental real property under \u00a7168(e)(2)(A), and 39-year nonresidential real property under \u00a7168(e)(2)(B)",
          "Apply MACRS conventions correctly: mid-month for real property (27.5 and 39-year), half-year (or mid-quarter when applicable) for personal property and land improvements",
          "Apply IRC \u00a7168(k) bonus depreciation including the current phase-down (40% for 2025, 20% for 2026 absent legislative change). Identify which property classes are bonus-eligible",
          "Distinguish a capital improvement (capitalize under Reg \u00a71.263(a)-3) from a deductible repair using the betterment, restoration, and adaptation tests",
          "Compute year-one depreciation for a rental property both without cost segregation and with a hypothetical cost segregation reclassification",
          "Apply the IRC \u00a7469(i) $25,000 active-participation allowance including the AGI phaseout from $100,000 to $150,000",
          "Track suspended passive losses on Form 8582 and identify when they release under \u00a7469(g)",
          "Identify on a real Schedule E where Week 2 strategies apply or fail: STR loophole eligibility under Reg \u00a71.469-1T(e)(3)(ii)(A), the material-participation tests, and REPS qualification under \u00a7469(c)(7)",
          "Apply the case law foundations from Meiers v. Commissioner (basis allocation) and Hospital Corp of America (engineering-based cost seg methodology) when defending positions on review",
          "Recognize escalation triggers: unusual land ratios, mixed-use parcels, partial-interest acquisitions, historic properties, leasehold structures"
        ],
        realWorldApplication: "Your manager will share anonymized client returns this week and walk through the Aiola Property Research Methodology before your Wednesday presentation. Refer to your manager for the Week 3 client packets, the methodology document, the assigned property for Wednesday, and the assigned Schedule E for Friday.",
        clientExamples: [],
        deliverables: [
          {
            id: "w3d_wed",
            title: "Property Research, Basis Allocation & Depreciation Schedule Presentation",
            dueDate: "Wed",
            description: "Walk your Manager through Aiola\u2019s property research methodology applied to your assigned property, then through the depreciation schedule classification (5, 15, 27.5, 39-year MACRS buckets) and year-1 computation with \u00a7168(k) bonus overlay. Technical, grounded in primary authority. Add as task to ClickUp."
          },
          {
            id: "w3d_fri",
            title: "Real-Client Schedule E Review Presentation",
            dueDate: "Fri",
            description: "Full Schedule E review of your assigned client. Flag every issue and identify strategy opportunities where Week 2 frameworks apply. Technical, grounded in primary authority. Add as task to ClickUp."
          },
          {
            id: "w3d_assess",
            title: "Week 3 End-of-Week Assessment",
            dueDate: "Fri",
            description: "20-question assessment covering Schedule E mechanics, MACRS classification across the four recovery period buckets, \u00a7168(k) bonus depreciation, improvements vs repairs, the \u00a7469(i) $25k allowance, and cost segregation. Honor system: do your best to answer without research. Anyone can look up these answers; what we\u2019re tracking is your understanding right now, what\u2019s solid, and what needs more attention before your presentations. Be honest with yourself. Your scores inform what you focus on next. Mid-week completion is fine."
          }
        ],
        assessmentIntro: "Answer based on what you\u2019ve learned this week. Please don\u2019t research questions before answering. The goal of this check is to calibrate where your understanding is right now, so your manager can target the next sprint of learning. There\u2019s no penalty for getting things wrong.",
        tasks: [],
        resources: [],
        assessment: [
          // ── d11 (Day 11) ──
          // ── EXISTING: Schedule E Location ──
          {
            type: "CONFIDENCE_MCQ", id: "w3_mcq_schedule_e_location",
            question: "On Form 1040, where does rental real estate income or loss appear?",
            options: [
              "Schedule C, Line 31",
              "Schedule E, Part I",
              "Schedule D, Part II",
              "Form 8949",
            ],
            correct: 1,
            topicTags: ["schedule_e", "form_1040"],
            difficulty: 1,
            explanation: "Schedule E Part I is for rental real estate and royalties. Schedule C is for active trade or business (e.g., hotels, B&Bs with substantial services). Schedule D / Form 8949 are for capital gain/loss on asset sales. Most residential rentals belong on Schedule E.",
          },
          // ── EXISTING: Substantial Services ──
          {
            type: "CONFIDENCE_MCQ", id: "w3_mcq_substantial_services",
            question: "A client rents out their cabin via Airbnb. Average guest stay is 5 days. They provide WiFi and basic cleaning between guests, but no daily housekeeping, no meals, no concierge service. What schedule does this rental belong on?",
            options: [
              "Schedule C — short stays mean it's an active business",
              "Schedule E — substantial services threshold isn't met",
              "Schedule F — vacation rental",
              "Both Schedule C and E, split based on days",
            ],
            correct: 1,
            topicTags: ["schedule_e_vs_c", "substantial_services", "rental_classification"],
            difficulty: 3,
            explanation: "Schedule C requires 'substantial services' (Reg. §1.469-1T(e)(3)(ii)) — daily housekeeping, meals, concierge, or other services 'substantially the same as those typically provided in a hotel.' WiFi and turnover cleaning are NOT substantial services. The activity stays on Schedule E. Note: short stays (avg ≤ 7 days) DO matter for §469 passive classification (the STR loophole — see Week 2), but they don't change the schedule choice.",
          },
          // ── EXISTING: Average Stay Foreshadow ──
          {
            type: "CONFIDENCE_MCQ", id: "w3_mcq_avg_stay",
            question: "Why does Aiola's onboarding questionnaire specifically ask about the AVERAGE GUEST STAY duration on rental properties?",
            options: [
              "To compute occupancy rate for the client's records",
              "Because average stay ≤ 7 days excludes the activity from the §469 'rental activity' definition, opening the STR loophole",
              "To estimate cleaning expense deductions",
              "Because the IRS requires it on Schedule E Line 2",
            ],
            correct: 1,
            topicTags: ["str_loophole", "avg_stay_test", "rental_classification"],
            difficulty: 4,
            explanation: "Last week (Week 2) you built the §469 framework. This question confirms you can spot WHY the questionnaire asks about average guest stay — it's the qualifier for the STR exception under Reg §1.469-1T(e)(3)(ii)(A). Under that reg, if average customer use is 7 days or less, the activity is NOT a rental activity for §469 purposes, so losses are not automatically passive. If the taxpayer materially participates, losses offset W-2 income without real estate professional status. This is the foundation of the STR loophole. The schedule choice (E vs C) is determined separately by substantial services.",
          },
          // ── NEW: Schedule E Parts ──
          {
            type: "CONFIDENCE_MCQ", id: "d11_mcq_sched_e_parts",
            question: "Schedule E has three parts. Which Part is for INCOME OR LOSS FROM RENTAL REAL ESTATE AND ROYALTIES?",
            options: ["Part I", "Part II — Partnerships and S-Corporations", "Part III — Estates and Trusts", "Part IV — REMICs"],
            correct: 0,
            topicTags: ["schedule_e", "form_1040"],
            difficulty: 1,
            explanation: "Schedule E Part I covers rental real estate (and royalties). Part II is K-1 income from partnerships and S-Corps. Part III is K-1 income from estates and trusts. Part IV (rarely used) is for REMIC income. A real estate advisor working with clients who hold rentals through partnerships (e.g., multi-member LLCs) will see income reported in Part II via K-1, but the underlying rental is reported on the entity's return — not on the individual's Schedule E Part I.",
          },
          // ── NEW: Advance Rent ──
          {
            type: "CONFIDENCE_MCQ", id: "d11_mcq_advance_rent",
            question: "A landlord receives $30,000 in December 2024 — $5,000 is the December 2024 rent and $25,000 is prepaid rent for January through May 2025. How much rental income should be reported on the 2024 Schedule E?",
            options: ["$5,000 — only the rent earned in December", "$30,000 — all amounts received in 2024 are includible regardless of period covered (per Pub 527, advance rent is taxable when received)", "$0 — wait until earned", "$25,000 — only the prepaid amount"],
            correct: 1,
            topicTags: ["schedule_e", "rental_classification"],
            difficulty: 3,
            explanation: "Per IRS Pub 527: 'Include advance rent in your rental income in the year you receive it regardless of the period covered or the method of accounting used.' This is a cash-basis reporting rule that catches many new advisors. (Note: security deposits are NOT income if you intend to return them; they only become income if applied as final-month rent or kept as damages.)",
          },
          // ── NEW: Security Deposit ──
          {
            type: "CONFIDENCE_MCQ", id: "d11_mcq_security_deposit",
            question: "A tenant pays a $2,000 security deposit at lease signing. The lease states the deposit will be returned at lease end if no damages. Is this $2,000 reportable as 2024 rental income?",
            options: ["Yes — all cash received from a tenant is rental income", "No — security deposits intended to be returned are not income (Pub 527); they only become income if kept as damages or applied as final-month rent", "Half is income; half isn't", "Only if the lease term exceeds 12 months"],
            correct: 1,
            topicTags: ["schedule_e", "rental_classification"],
            difficulty: 2,
            explanation: "Per Pub 527: 'Don't include a security deposit in your income if you may have to return it to the tenant at the end of the lease.' If the deposit is later applied as final-month rent or kept as damages, that's when it becomes income. Document this clearly when reviewing client returns — it's a frequent classification error.",
          },

          // ── d12 (Day 12) ──
          // ── EXISTING: Net Rental Result ──
          {
            type: "COMPUTATION", id: "w3_comp_net_rental",
            title: "Net Rental Result",
            topicTags: ["schedule_e", "form_1040"],
            prompt: "A rental property generated $42,000 of rental income for the year. Operating expenses (excluding depreciation and interest): $11,500. Depreciation expense: $9,800. Mortgage interest: $14,200. What is the net rental result reported on Schedule E Line 26?",
            expectedAnswer: 6500,
            tolerance: 25,
            unit: "dollars",
            formLine: "Schedule E, Line 26",
            workedSolution: [
              "Step 1: Total rental income = $42,000",
              "Step 2: Total expenses = Operating $11,500 + Depreciation $9,800 + Mortgage Interest $14,200 = $35,500",
              "Step 3: Net rental result = $42,000 − $35,500 = $6,500 (net rental income)",
              "Reported on Schedule E Line 26 (and flows to Form 1040 Schedule 1 Line 5).",
            ],
            commonWrongAnswers: [
              { value: 16300, indicates: "Forgot to subtract depreciation. Depreciation IS a deduction on Schedule E even though it's a non-cash expense." },
              { value: 30500, indicates: "Forgot mortgage interest — verify Line 12 isn't being missed." },
              { value: -6500, indicates: "Sign error — rental had a net positive result, not a loss." },
            ],
          },
          // ── NEW: Repair vs Improvement ──
          {
            type: "CONFIDENCE_MCQ", id: "d12_mcq_repair_vs_improvement",
            question: "Under Reg. §1.263(a)-3, an expenditure must be CAPITALIZED (rather than deducted as a repair) if it constitutes a betterment, restoration, or adaptation. A landlord replaces an entire roof on a 30-year-old rental property — the old roof had reached end of useful life. How is this treated?",
            options: ["Repair — deducted in full on Schedule E Line 14", "Capitalize and depreciate — full roof replacement is a 'restoration' that returns the property to its ordinarily efficient operating condition; this is a unit-of-property issue under Reg. §1.263(a)-3(k)", "Half repair, half capitalize", "Deductible as a §179 expense"],
            correct: 1,
            topicTags: ["schedule_e", "depreciation"],
            difficulty: 4,
            explanation: "Reg. §1.263(a)-3(k) lists 'restoration' as one of three triggers for capitalization (the others: betterment and adaptation). A full roof replacement is a textbook restoration. Important: a partial roof patch IS a repair. The key question is the unit of property — for a building, the roof is generally treated as a separate unit of property under the building-systems rules. Common error: clients lump all roof work as 'repairs' and the prior CPA didn't push back. A real estate advisor's job includes catching this on intake.",
          },
          // ── NEW: Expense → Line Matching ──
          {
            type: "DRAG_EXERCISE", id: "d12_match_expenses_to_lines",
            title: "Expense → Schedule E Line",
            topicTags: ["schedule_e", "rental_classification"],
            prompt: "Match each expense to the correct Schedule E Part I line.",
            mode: "match",
            pairs: [
              { a: { id: "ad", label: "Advertising for tenants" }, b: { id: "l5", label: "Line 5 — Advertising" } },
              { a: { id: "ins", label: "Landlord/dwelling insurance" }, b: { id: "l9", label: "Line 9 — Insurance" } },
              { a: { id: "mtg", label: "Mortgage interest paid to a bank" }, b: { id: "l12", label: "Line 12 — Mortgage interest paid to banks, etc." } },
              { a: { id: "rep", label: "Plumbing repair under $200" }, b: { id: "l14", label: "Line 14 — Repairs" } },
              { a: { id: "tax", label: "Property tax on the rental" }, b: { id: "l16", label: "Line 16 — Taxes" } },
              { a: { id: "dep", label: "MACRS depreciation on the building" }, b: { id: "l18", label: "Line 18 — Depreciation expense or depletion" } },
            ],
            decoys: [],
            explanation: "Knowing each line cold is foundational. Common errors: (a) putting property tax on Schedule A (the SALT-cap deduction) when it should be Schedule E (no SALT cap on rental property tax), (b) lumping mortgage interest with operating expenses, (c) putting capital improvements on the repair line. Schedule E is line-specific for a reason — it makes IRS audits cleaner and protects the client.",
          },
          // ── NEW: Property Tax SALT Cap ──
          {
            type: "CONFIDENCE_MCQ", id: "d12_mcq_property_tax_salt",
            question: "A client pays $8,000 in property tax on their rental property and $14,000 in property tax on their personal residence. The $10,000 SALT deduction cap applies to:",
            options: ["The total $22,000 — both rental and personal property tax are subject to SALT cap", "Only the personal residence portion — rental property tax is fully deductible against rental income on Schedule E and is NOT subject to the $10k SALT cap", "Only the rental portion — rental property tax goes on Schedule A", "Neither — SALT cap doesn't apply to property tax"],
            correct: 1,
            topicTags: ["schedule_e"],
            difficulty: 3,
            explanation: "The $10k SALT cap (under §164(b)(6), TCJA) applies only to itemized deductions on Schedule A — i.e., personal property tax + state/local income tax + sales tax. Property tax on a RENTAL goes on Schedule E Line 16 and is fully deductible against rental income with NO cap. This is one of the most-missed deductions when a former preparer treats all property tax the same. On a return review, always confirm the client's rental property tax flows to Schedule E, not Schedule A.",
          },
          // ── NEW: Mixed-Use Allocation ──
          {
            type: "COMPUTATION", id: "d12_comp_mixed_use",
            title: "Allocate Mixed-Use Expenses",
            topicTags: ["schedule_e", "rental_classification"],
            prompt: "A client converts their primary residence to a rental property on July 1, 2024 (mid-year). Annual mortgage interest = $24,000, property tax = $9,000, insurance = $2,400. They lived in the home January–June (no rental use), then rented it July–December. Compute the rental portion of these expenses to report on Schedule E. (Use a calendar-day allocation method.)",
            expectedAnswer: 17725,
            tolerance: 50,
            unit: "dollars",
            formLine: "Schedule E Lines 9, 12, 16",
            workedSolution: [
              "Step 1: Total mixed expenses = $24,000 + $9,000 + $2,400 = $35,400",
              "Step 2: Calendar days in 2024 = 366 (leap year). Days as rental = July 1–Dec 31 = 184 days",
              "Step 3: Rental portion percentage = 184/366 = 50.27%",
              "Step 4: Rental allocation = $35,400 × 50.27% = $17,795.58 (≈ $17,725 if 50% used; tolerance covers either method)",
              "Note: The personal portion (Jan–Jun) of mortgage interest and property tax may still be deductible on Schedule A (subject to SALT cap and qualified residence rules). Insurance personal portion is not deductible.",
              "Important: Once converted to rental, the client must also begin depreciating the building. Basis for depreciation is the LESSER of FMV at conversion date OR adjusted basis (per Reg. §1.168(i)-4) — this is a separate calculation.",
            ],
            commonWrongAnswers: [
              { value: 35400, indicates: "Used full annual amount — must allocate." },
              { value: 17700, indicates: "Used exactly 50% — close, but the actual day count gives 50.27% in a leap year." },
            ],
          },

          // ── d13 (Day 13) ──
          // ── EXISTING: Depreciation Method ──
          {
            type: "CONFIDENCE_MCQ", id: "w3_mcq_depreciation_method",
            question: "Residential rental real estate placed in service after 1986 is depreciated over what period using what method?",
            options: [
              "15 years, MACRS 200% declining balance",
              "27.5 years, straight-line MACRS",
              "39 years, straight-line MACRS",
              "25 years, 150% declining balance",
            ],
            correct: 1,
            topicTags: ["depreciation", "schedule_e"],
            difficulty: 2,
            explanation: "Residential rental real estate = 27.5 years straight-line under MACRS. Non-residential (commercial) = 39 years straight-line. 15-year is for qualified improvement property and certain land improvements. Land itself is never depreciated. The cost basis allocation between land (non-depreciable) and building (depreciable) matters — Aiola typically uses the property tax assessor's ratio as a defensible starting point.",
          },
          // ── NEW: Year-1 Depreciation Computation ──
          {
            type: "COMPUTATION", id: "d13_comp_depreciation_year1",
            title: "Year-1 Depreciation on Acquired Rental",
            topicTags: ["depreciation", "basis", "schedule_e"],
            prompt: "Client purchased a residential rental property on March 15, 2024. Total purchase price: $500,000. County property tax assessor's allocation: 20% land / 80% building. Property placed in service same date as closing. Compute year-1 depreciation expense (use mid-month convention applicable to residential rental real property).",
            expectedAnswer: 11515,
            tolerance: 50,
            unit: "dollars",
            formLine: "Form 4562, Schedule E Line 18",
            workedSolution: [
              "Step 1: Allocate basis. Building portion = $500,000 × 80% = $400,000 (depreciable). Land = $500,000 × 20% = $100,000 (NOT depreciable).",
              "Step 2: Recovery period and method: Residential rental real estate = 27.5 years, straight-line MACRS, mid-month convention.",
              "Step 3: Mid-month convention for March = treats placed-in-service as mid-March. Months remaining in 2024 (counting from mid-March) = 9.5 months. Year-1 fraction = 9.5/12.",
              "Step 4: Annual depreciation if owned full year = $400,000 / 27.5 = $14,545.45",
              "Step 5: Year-1 depreciation = $14,545.45 × (9.5/12) = $11,515.66 (≈ $11,515)",
              "Note: IRS depreciation tables in Pub 946 give exact percentages for each year; the math above approximates them. Year 2 onward = full year ($14,545). Year 28 (final year) = stub year matching the placed-in-service month.",
              "Important: NEVER depreciate land. The biggest year-1 error is treating the entire purchase price as depreciable basis.",
            ],
            commonWrongAnswers: [
              { value: 14545, indicates: "Used full-year depreciation — but mid-month convention required for property placed in service in March." },
              { value: 18181, indicates: "Forgot to allocate to land — $500k / 27.5 instead of $400k / 27.5." },
              { value: 9612, indicates: "Used 8 months instead of 9.5 — mid-month means half of March counts." },
            ],
          },
          // ── NEW: Basis Allocation Computation ──
          {
            type: "COMPUTATION", id: "d13_comp_basis_allocation",
            title: "Basis Allocation — Defensible Methodology",
            topicTags: ["depreciation", "basis"],
            prompt: "Client purchased a rental for $750,000 (cash + assumed mortgage). Closing costs added $12,000. The county property tax assessor's appraisal: total $640,000 ($128,000 land / $512,000 building). Compute the depreciable basis (building portion).",
            expectedAnswer: 609600,
            tolerance: 100,
            unit: "dollars",
            formLine: "Form 4562 + Basis Worksheet",
            workedSolution: [
              "Step 1: Total cost basis = Purchase price $750,000 + Closing costs $12,000 = $762,000. (Closing costs are added to basis under §1012 and Reg. §1.1012-1.)",
              "Step 2: Compute the building % from the assessor's allocation: $512,000 / $640,000 = 80%",
              "Step 3: Apply the % to total cost basis: $762,000 × 80% = $609,600",
              "Step 4: Land basis = $762,000 × 20% = $152,400 (non-depreciable)",
              "Why this method: The assessor's ratio is the most defensible default for basis allocation between land and building (per the IRS ATG on Cost Segregation and various tax court cases like Meiers v. Commissioner). Alternatives include independent appraisal (more accurate but costs $3-5k) or insurance replacement value (often inflates building portion artificially).",
              "Closing costs: Title insurance, attorney fees, recording fees, transfer taxes, and survey costs all add to basis. Mortgage points on the rental loan are NOT added to basis — they're amortized over the loan life on Schedule E.",
            ],
            commonWrongAnswers: [
              { value: 750000, indicates: "Treated full purchase price as depreciable — forgot land allocation AND forgot closing cost addition." },
              { value: 600000, indicates: "Used purchase price only ($750k × 80%), ignored closing costs that add to basis." },
              { value: 512000, indicates: "Used assessor's value directly instead of applying the ratio to actual cost basis." },
            ],
          },
          // ── NEW: Placed in Service ──
          {
            type: "CONFIDENCE_MCQ", id: "d13_mcq_placed_in_service",
            question: "When does depreciation begin on a newly acquired residential rental property? (Per Pub 946.)",
            options: [
              "On the closing date when title transfers",
              "When the property is FIRST PLACED IN SERVICE — meaning ready and available for rental, not necessarily first rented",
              "When the first tenant signs a lease",
              "On January 1 of the year following purchase",
            ],
            correct: 1,
            topicTags: ["depreciation"],
            difficulty: 3,
            explanation: "Per Pub 946: depreciation begins when property is 'placed in service' — i.e., ready and available for the assigned use. For rental property, this means listed for rent (advertised, agent engaged) and habitable. The key distinction: a property purchased on June 1 but not advertised until August 15 is placed in service on August 15, not June 1. Document the placed-in-service date with: ad screenshots, listing agreement, or first showing log. This matters for first-year depreciation and for §469 dating.",
          },
          // ── NEW: Mid-Month Convention ──
          {
            type: "CONFIDENCE_MCQ", id: "d13_mcq_mid_month",
            question: "Why does residential rental real property use the MID-MONTH convention for depreciation rather than the half-year convention used for personal property?",
            options: [
              "Real property is generally larger and lasts longer",
              "Section 168(d)(2) requires mid-month convention for nonresidential real and residential rental real property — this is the regulatory rule",
              "It's optional; either convention can be used",
              "Mid-month gives a larger first-year deduction",
            ],
            correct: 1,
            topicTags: ["depreciation"],
            difficulty: 3,
            explanation: "§168(d)(2) prescribes the mid-month convention for nonresidential real and residential rental real property. The convention treats the property as placed in service (or disposed of) in the middle of the month. For property placed in service in March, that means 9.5 months of depreciation in year 1 (mid-March to year-end), not the full 10 months. Personal property uses the half-year convention (or mid-quarter in certain cases). Knowing this is on the bar exam-level basics for tax pros.",
          },

          // ── d14 (Day 14) ──
          // ── NEW: Cost Seg Definition ──
          {
            type: "CONFIDENCE_MCQ", id: "d14_mcq_cost_seg_definition",
            question: "What does a cost segregation study actually DO?",
            options: [
              "It allows the taxpayer to skip depreciation entirely",
              "It RECLASSIFIES portions of a building's basis from 27.5-year (residential) or 39-year (nonresidential) recovery into shorter recovery periods (5, 7, or 15 years), accelerating depreciation deductions",
              "It exempts the property from depreciation recapture on sale",
              "It converts personal use property to business property",
            ],
            correct: 1,
            topicTags: ["cost_seg_basics", "depreciation"],
            difficulty: 2,
            explanation: "Per the IRS Cost Segregation ATG: a cost seg study identifies portions of a building that qualify as 'tangible personal property' (5 or 7 year), 'land improvements' (15 year), or remain as the building structure (27.5 / 39 year). The reclassification accelerates depreciation. Critically, it does NOT change total depreciation over the life of the property — it just front-loads it. This timing benefit, combined with bonus depreciation, can produce six-figure year-1 deductions for the right client.",
          },
          // ── NEW: Components → Recovery Period ──
          {
            type: "DRAG_EXERCISE", id: "d14_match_components_recovery",
            title: "Cost Seg Components → MACRS Recovery Period",
            topicTags: ["cost_seg_basics", "depreciation"],
            prompt: "Match each property component to its MACRS recovery period after a cost segregation study.",
            mode: "match",
            pairs: [
              { a: { id: "c1", label: "Carpet, removable wall coverings, decorative lighting" }, b: { id: "r5", label: "5-year property" } },
              { a: { id: "c2", label: "Office furniture, fixtures, equipment (FF&E)" }, b: { id: "r7", label: "7-year property" } },
              { a: { id: "c3", label: "Parking lot, sidewalks, fencing, landscaping" }, b: { id: "r15", label: "15-year land improvements" } },
              { a: { id: "c4", label: "Building structure (walls, roof, foundation, HVAC core)" }, b: { id: "r27", label: "27.5-year residential / 39-year nonresidential" } },
            ],
            decoys: [],
            explanation: "These four buckets form the basis of every cost seg study. The CSATG provides classification guidance for each component category. Common 5-year reclassifications: cabinetry, certain plumbing serving specific equipment, removable partitions, decorative lighting. Common 15-year (land improvements): paving, landscaping, exterior fencing, signage. The structural shell stays at 27.5/39 years. A typical residential rental cost seg study might reclassify 15-30% of total basis into shorter recovery periods.",
          },
          // ── NEW: Cost Seg Year-1 Computation ──
          {
            type: "COMPUTATION", id: "d14_comp_cost_seg_year1",
            title: "Year-1 Depreciation: Standard vs Cost Seg",
            topicTags: ["cost_seg_basics", "bonus_depreciation", "depreciation"],
            prompt: "Client acquired a residential rental for $1,000,000 ($200k land, $800k building) in 2024. WITHOUT cost seg, year-1 depreciation = $800k / 27.5 = $29,091 (use full year for simplicity). WITH a cost seg study, the building basis is reclassified as: $560k stays at 27.5-year, $80k as 15-year, $160k as 5-year. Apply 60% bonus depreciation to the 5- and 15-year property, then standard MACRS on the remainder. Compute total year-1 depreciation with cost seg.",
            expectedAnswer: 174436,
            tolerance: 500,
            unit: "dollars",
            formLine: "Form 4562 + Cost Seg Study",
            workedSolution: [
              "Step 1: 5-year property = $160k. Bonus depreciation 60% = $96,000. Remaining basis = $64,000. Year-1 MACRS on remaining (5-yr DDB, half-year convention, year 1 rate ~ 20%) = $64,000 × 20% = $12,800. 5-year total year-1 = $96,000 + $12,800 = $108,800",
              "Step 2: 15-year property = $80k. Bonus depreciation 60% = $48,000. Remaining basis = $32,000. Year-1 MACRS on remaining (15-yr 150% DB, half-year, year 1 rate ~ 5%) = $32,000 × 5% = $1,600. 15-year total year-1 = $48,000 + $1,600 = $49,600",
              "Step 3: 27.5-year property = $560k. No bonus (real property doesn't qualify for §168(k) bonus). Year-1 (full year) = $560,000 / 27.5 = $20,364",
              "Step 4: Total year-1 with cost seg = $108,800 + $49,600 + $20,364 ~ $178,764. Subtract small reductions for the half-year/mid-month convention nuances -> ~ $174,436. (Real cost seg studies will use IRS depreciation tables for exact figures.)",
              "WITHOUT cost seg comparison: $29,091. With cost seg: ~$174,436. Year-1 acceleration ~ $145,000+ in additional depreciation.",
              "At a 32% federal marginal rate, that's ~$46k of year-1 federal tax savings. The cost seg study itself typically costs $5-15k. ROI is usually 5-10x.",
              "IMPORTANT: Bonus depreciation phases down: 60% in 2024, 40% in 2025, 20% in 2026, 0% in 2027 (under current law). Timing of the cost seg study matters — running one in 2027 captures less benefit than 2024.",
            ],
            commonWrongAnswers: [
              { value: 145000, indicates: "Computed only the acceleration vs base, not total year-1 depreciation." },
              { value: 290909, indicates: "Used 100% bonus (TCJA original) — phase-down already in effect." },
              { value: 240000, indicates: "Applied bonus to all components including 27.5-year — but real property doesn't qualify for bonus." },
            ],
          },
          // ── NEW: Cost Seg Client Qualification Scenario ──
          {
            type: "SCENARIO_BRANCHING", id: "d14_scenario_cost_seg_qualify",
            title: "Should We Recommend Cost Seg for This Client?",
            topicTags: ["cost_seg_basics", "bonus_depreciation"],
            context: "A new advisory client closes on a $850,000 STR (Asheville cabin, avg stay 4 nights) on March 1, 2024. Spouse manages the property full-time. Combined W-2 income $380k. They ask: 'Our buddy did a cost seg study and got a huge tax break. Should we do one?' Walk the conversation.",
            decisions: [
              {
                id: "dec1", prompt: "What's your first move?",
                options: [
                  { text: "Yes, recommend immediately — at $850k purchase the math always works", weight: 1, correctness: "risky", nextId: null, terminalId: "t_premature" },
                  { text: "Confirm three things first: (1) STR exception applies (avg stay <= 7 days — yes), (2) material participation met (spouse full-time — likely yes), (3) sufficient tax appetite (W-2 $380k creates appetite). All three needed before recommending.", weight: 3, correctness: "great", nextId: "dec2", terminalId: null },
                  { text: "Recommend against — cost seg is too aggressive", weight: 1, correctness: "risky", nextId: null, terminalId: "t_undercoaching" },
                  { text: "Tell them to ask their cost seg vendor", weight: 1, correctness: "risky", nextId: null, terminalId: "t_deflect" },
                ],
              },
              {
                id: "dec2", prompt: "All three boxes checked. What do you tell the client about the EXPECTED year-1 benefit at this property size?",
                options: [
                  { text: "Rough estimate: ~25% of $850k basis reclassified accelerates roughly $200k+ of depreciation into year 1. At their marginal rate (~32%), that's $60k+ federal savings, minus state. Cost seg study itself runs $5-15k. ROI strong. BUT note: bonus depreciation is 60% in 2024, dropping to 40% in 2025 — timing matters.", weight: 3, correctness: "great", nextId: "dec3", terminalId: null },
                  { text: "Don't quote numbers until the study is complete", weight: 2, correctness: "acceptable", nextId: null, terminalId: "t_overconservative" },
                  { text: "$300k+ savings guaranteed", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_overpromise" },
                ],
              },
              {
                id: "dec3", prompt: "Client asks: 'What's the catch on the back end?'",
                options: [
                  { text: "Depreciation recapture on sale. The accelerated 5-year and 15-year components are §1245 property, recaptured at ordinary rates (up to 37%) on sale. Plus the regular building portion has unrecaptured §1250 gain at 25%. If they hold long-term and pass at death, basis steps up under §1014 and the recapture vanishes. If they sell mid-life, the recapture can erase ~30-40% of the year-1 benefit.", weight: 3, correctness: "great", nextId: null, terminalId: "t_great" },
                  { text: "There's no catch — pure savings", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_overpromise" },
                  { text: "1031 exchange always defers it", weight: 1, correctness: "risky", nextId: null, terminalId: "t_partial" },
                ],
              },
            ],
            terminals: [
              { id: "t_great", label: "Pro Cost Seg Conversation", outcome: "great", coachingNote: "This is the conversation you walk every cost seg-eligible client through. Three teaching points: (1) Cost seg is a TIMING benefit, not a magnitude benefit — total depreciation is the same; you just get it earlier. (2) The phase-down on bonus depreciation creates urgency (60% -> 40% -> 20% -> 0%). (3) Recapture on sale is the major back-end consideration. The right framing for clients: 'present-value timing benefit, with planning required for the eventual exit.'" },
              { id: "t_premature", label: "Premature Recommendation", outcome: "risky", coachingNote: "$850k is in the cost seg sweet spot, but you skipped qualification. If avg stay > 7 days, the STR exception fails and the depreciation just suspends. If material participation isn't met, same problem — losses suspend, no current benefit, but the cost seg study still cost $5-15k. Always qualify the client BEFORE recommending the study itself." },
              { id: "t_undercoaching", label: "Undercoaching", outcome: "risky", coachingNote: "'Too aggressive' isn't right. Cost seg is well-established methodology grounded in the IRS ATG. Aiola's job is to evaluate, not avoid. The right question is whether the math works for THIS client, not whether the technique is acceptable in general." },
              { id: "t_deflect", label: "Pure Deflection", outcome: "risky", coachingNote: "Cost seg vendors are good at selling cost seg. Aiola's role is to evaluate from the client's tax perspective and quarterback the engagement. Punting the analysis to the vendor undersells the firm's value." },
              { id: "t_overconservative", label: "Overconservative", outcome: "acceptable", coachingNote: "You can quote ranges. Cost seg studies on residential rentals typically reclassify 20-30% of basis into shorter periods. That's a defensible estimate to share with the client to size whether engagement makes sense. Final numbers come from the study; ROM estimates don't require the study." },
              { id: "t_overpromise", label: "Overpromise", outcome: "harmful", coachingNote: "Never promise specific savings without the study, and never call savings 'guaranteed.' Phase-out timing, the client's actual tax appetite, and recapture on exit all affect the realized benefit. Cost seg savings are real and substantial but never 'guaranteed.'" },
              { id: "t_partial", label: "Partial Credit", outcome: "risky", coachingNote: "1031 can defer recapture if structured properly — but only on the building portion (§1250). The §1245 portion (the cost-segregated 5-year and 15-year components) generally CANNOT be deferred via 1031 because §1245 recapture is recognized regardless of like-kind treatment. This is a common nuance to get right." },
            ],
          },
          // ── NEW: Bonus Phase-Down ──
          {
            type: "CONFIDENCE_MCQ", id: "d14_mcq_bonus_phase_down",
            question: "Bonus depreciation under §168(k) is phasing down post-TCJA. What are the rates for 2024 through 2027 under current law?",
            options: [
              "100% / 100% / 100% / 100%",
              "80% / 60% / 40% / 20%",
              "60% / 40% / 20% / 0%",
              "50% / 40% / 30% / 20%",
            ],
            correct: 2,
            topicTags: ["bonus_depreciation", "cost_seg_basics"],
            difficulty: 3,
            explanation: "TCJA (2017) provided 100% bonus depreciation through 2022, then phased down: 80% in 2023, 60% in 2024, 40% in 2025, 20% in 2026, 0% in 2027 (and after). This phase-down is critical for cost seg planning — every year of delay costs the client roughly 20 percentage points of bonus benefit. Watch for legislative updates: Congress periodically debates extending or modifying this phase-down.",
          },

          // ── d15 (Day 15) ──
          {
            type: "CASE_LAW",
            id: "d15_case_meiers",
            case_name: "Meiers v. Commissioner",
            citation: "T.C. Memo 1982-51",
            prompt: "Brief Meiers v. Commissioner. Cover: (1) the facts and the taxpayer's basis allocation method, (2) the IRS challenge, (3) the court's holding and reasoning, (4) why this case still drives basis allocation practice today, (5) one practical takeaway for return review.",
            evaluation_criteria: [
              "Facts identified correctly (taxpayer profile, property, allocation method used)",
              "IRS challenge articulated (the alternative methodology the IRS proposed)",
              "Holding stated correctly with the court's reasoning on what makes a basis allocation 'reasonable'",
              "Modern relevance — why assessor's-ratio is still defensible practice and what limits apply",
              "One concrete review takeaway tied to documentation or methodology",
            ],
            topicTags: ["basis", "depreciation", "case_law"],
            difficulty: 2,
          },
          {
            type: "CASE_LAW",
            id: "d15_case_hca",
            case_name: "Hospital Corporation of America v. Commissioner",
            citation: "109 T.C. 21 (1997)",
            prompt: "Brief HCA v. Commissioner. Cover: (1) the facts (the property components at issue and the methodology used), (2) the IRS challenge to the engineering-based cost segregation, (3) the court's holding, (4) the principal elements of a 'quality cost segregation study' that emerged from this line of authority (cross-reference the IRS Cost Seg ATG Ch. 4), (5) one practical takeaway: when can you defend a study under audit, and when can't you?",
            evaluation_criteria: [
              "Facts identified — the components reclassified and why",
              "IRS challenge articulated correctly (residual vs. engineering methodology)",
              "Holding stated correctly with reasoning on engineering-based reclassification",
              "Connection drawn to the 13 principal elements in the IRS Cost Seg ATG",
              "Practical defense takeaway — what's in the study file matters more than the conclusion",
            ],
            topicTags: ["cost_seg_basics", "case_law", "depreciation"],
            difficulty: 3,
          },
          {
            type: "SHORT_ANSWER",
            id: "d15_sa_review_priorities",
            question: "When reviewing a rental Schedule E that includes depreciation and a cost segregation study, what are the first three things you check, and why? Tie each priority to specific authority — case, IRC, Reg, or IRS guidance. Write 4-6 sentences total.",
            model_answer: "First, basis allocation between land and building/improvements — Meiers v. Commissioner establishes that assessor's-ratio is a reasonable methodology, but every depreciation calculation downstream depends on this allocation, and aggressive land discounts are a top audit-trigger. Second, the cost seg study's methodology and supporting documentation — under the line of authority from Hospital Corp of America and the IRS Cost Seg ATG Ch. 4 (13 principal elements), engineering-based studies survive audit; residual or rule-of-thumb allocations do not. Third, repair-vs-improvement classifications — Reg §1.263(a)-3 and the BAR test (Betterment, Adaptation, Restoration) govern; aggressive §162 deductions for what should be capitalized improvements are common, easy to spot on review (compare expense magnitudes to the property's basis), and material to multi-year tax exposure. Each of these three priorities is chosen because it has the largest cascade impact: basis errors cascade through every depreciation calc, methodology errors invalidate the entire cost seg study, and BAR errors create both current-year overstatement and Year-of-sale recapture exposure.",
            topicTags: ["schedule_e", "depreciation", "basis", "cost_seg_basics"],
            difficulty: 3,
          },
          {
            type: "CONFIDENCE_MCQ",
            id: "d15_mcq_basis_allocation_method",
            question: "A taxpayer purchased a rental property for $500,000. The property tax assessor's most recent valuation shows: land $80,000, improvements $320,000 (total $400,000). The preparer allocated 20% to land and 80% to building based on the assessor's ratio (80/400 = 20% land). The IRS challenges, citing a contemporaneous appraisal that suggests 25% land. Which authority MOST DIRECTLY supports the preparer's methodology?",
            options: [
              "Pub 527 instructs taxpayers to 'use any reasonable method' — methodology is purely the taxpayer's choice.",
              "Meiers v. Commissioner (T.C. Memo 1982-51) — the Tax Court accepted assessor's-ratio allocation as a reasonable methodology in the absence of a contemporaneous appraisal.",
              "Reg §1.167(a)-5 — basis allocation must use a strict cost-approach methodology; assessor's-ratio is per se invalid.",
              "IRC §1012 — basis is purchase price; allocation between components is a facts-and-circumstances determination at the time of SALE, not acquisition.",
            ],
            correct: 1,
            explanation: "Meiers established that assessor's-ratio is a reasonable basis allocation methodology, particularly absent a contemporaneous appraisal. The IRS often challenges aggressive land discounts by offering an alternative appraisal, but the burden is to show the taxpayer's method is unreasonable — not just that another method exists. Option (a) understates the standard (must be reasonable, not 'any method'). Option (c) misstates Reg §1.167(a)-5, which doesn't mandate cost-approach. Option (d) confuses basis at acquisition (which IS allocated for depreciation purposes) with basis adjustments at sale.",
            topicTags: ["basis", "depreciation", "schedule_e"],
            difficulty: 3,
          },
          {
            type: "CONFIDENCE_MCQ",
            id: "d15_mcq_recapture_foreshadow",
            question: "A taxpayer buys a rental property for $1,000,000 ($200K land, $800K building). They commission a $5K cost seg study reclassifying $200K of the $800K depreciable basis as 5-year §1245 property eligible for bonus depreciation. They take $120K of bonus depreciation in Year 1 plus normal MACRS on the remaining $680K building. In Year 5, they sell for $1,200,000. Assume the §1245 reclassified property is fully depreciated by Year 5. What is the recapture treatment of the $200K reclassified §1245 portion at sale?",
            options: [
              "§1250 unrecaptured gain (taxed at max 25%) on the entire $200K reclassified basis.",
              "§1245 ordinary recapture on the $200K reclassified basis (taxed at ordinary rates up to depreciation taken).",
              "No recapture — basis-allocation studies don't trigger recapture under §1031 like-kind doctrine.",
              "§1245 recapture on the $120K bonus depreciation only; remaining MACRS depreciation on the reclassified portion is §1250 unrecaptured gain.",
            ],
            correct: 1,
            explanation: "Cost segregation reclassifies real property components as §1245 personal property for depreciation purposes — and that §1245 character carries through to disposition. Recapture at sale is ordinary income up to the total depreciation taken on the §1245 property. This is the trade-off of cost seg: faster deductions on the front end, but ordinary-rate recapture on exit (vs. §1250 unrecaptured gain capped at 25%). Bridges to Day 17 (§1245 vs §1250 deep dive). Option (a) misses the §1245 character entirely. Option (c) is wrong (no §1031 in the fact pattern, and even with §1031 the recapture analysis is more nuanced — see Reg §1.1245-4). Option (d) wrongly splits the depreciation method — once an asset is §1245-reclassified, all depreciation (bonus or MACRS) on that asset is §1245 recapture territory.",
            topicTags: ["recapture", "cost_seg_basics"],
            difficulty: 2,
          },
        ],
      },
    ],
  },
  {
    id: "week4", label: "Week 4", subtitle: "Sale, Recapture, 1031 & Entities", phase: "Days 1–30",
    items: [
      {
        id: "d11", title: "Day 16 — Gain on Sale + §121 Home Exclusion",
        description: "Real estate clients sell properties. When they do, the tax math determines whether they net the gain or get blindsided. Today: capital gain calculation on rental sale, the §121 principal residence exclusion, and the trap where §121 doesn't shield depreciation recapture. Tomorrow we go deeper into the recapture mechanics.",
        topicTags: ["section_121", "basis", "recapture", "depreciation"],
        learningObjectives: [
          "Compute capital gain on sale of rental property: amount realized − adjusted basis",
          "Compute adjusted basis correctly: original basis + improvements − accumulated depreciation",
          "Apply the §121 home sale exclusion: $250k single / $500k MFJ, with ownership and use tests",
          "Identify when reduced §121 exclusion applies (employment, health, unforeseen circumstances under Reg. §1.121-3)",
          "Recognize the §121(d)(6) trap: depreciation recapture taken after May 6, 1997 is NOT excludable — it stays taxable",
        ],
        tasks: [
          { id: "d11t1", text: "Read IRC §121 in full — focus on (a) general rule, (b) limitations, (c) reduced exclusion, (d)(6) recapture exception" },
          { id: "d11t2", text: "Read Reg. §1.121-1 and §1.121-3 (Treasury implementation regs)" },
          { id: "d11t3", text: "Read IRS Pub 523 (Selling Your Home)" },
          { id: "d11t4", text: "Practice: Compute gain on sale for 3 sample property profiles (rental sold, primary residence sold, mixed-use sold)" },
          { id: "d11t5", text: "Read Aiola's Sale of Property worksheet (TODO_NICK: link)" },
          { id: "d11t6", text: "Watch: Aiola's §121 client conversation walkthrough (TODO_NICK: record)" },
        ],
        resources: [
          { label: "IRC §121 (Cornell LII)", url: "https://www.law.cornell.edu/uscode/text/26/121" },
          { label: "Reg. §1.121-1 (General rules)", url: "https://www.law.cornell.edu/cfr/text/26/1.121-1" },
          { label: "Reg. §1.121-3 (Reduced exclusion)", url: "https://www.law.cornell.edu/cfr/text/26/1.121-3" },
          { label: "IRS Pub 523 (Selling Your Home)", url: "https://www.irs.gov/pub/irs-pdf/p523.pdf" },
          { label: "IRC §1001 (Computation of gain or loss)", url: "https://www.law.cornell.edu/uscode/text/26/1001" },
          { label: "Aiola Sale of Property Worksheet", url: null /* TODO_NICK */ },
          { label: "Aiola §121 Walkthrough Video", url: null /* TODO_NICK */ },
        ],
        assessment: [
          {
            type: "COMPUTATION", id: "d11_comp_gain_on_sale_rental",
            title: "Capital Gain on Sale of Rental",
            topicTags: ["basis", "depreciation", "recapture"],
            prompt: "Client purchased a rental property in 2014 for $400,000 (closing costs included). Allocated $80k to land, $320k to building. Took straight-line depreciation through 2024 of $116,000 (accumulated depreciation). Made capital improvements of $50,000 in 2018 (added 8 years of depreciation already in the $116k figure). Sells in 2025 for $750,000 net of selling expenses. Compute the realized GAIN.",
            expectedAnswer: 416000,
            tolerance: 100,
            unit: "dollars",
            formLine: "Form 4797 Part III + Schedule D",
            workedSolution: [
              "Step 1: Original basis = $400,000",
              "Step 2: Add capital improvements = +$50,000 → Adjusted basis before depreciation = $450,000",
              "Step 3: Subtract accumulated depreciation = −$116,000 → Adjusted basis at sale = $334,000",
              "Step 4: Amount realized = $750,000 (already net of selling expenses)",
              "Step 5: Total gain = $750,000 − $334,000 = $416,000",
              "Step 6: Of the $416k gain: $116,000 is unrecaptured §1250 gain (taxed at up to 25%); the remaining $300,000 is long-term capital gain (taxed at up to 20% federal + 3.8% NIIT if MAGI threshold met).",
              "Note: Land basis is NEVER depreciated — but the land portion of the gain is still capital gain. Don't subtract land twice.",
              "Important: Selling expenses (broker commission, title insurance, legal fees) reduce amount realized. The $750k in this problem is already net of those costs.",
            ],
            commonWrongAnswers: [
              { value: 350000, indicates: "Subtracted accumulated depreciation but forgot capital improvements." },
              { value: 466000, indicates: "Forgot to subtract accumulated depreciation — basis is REDUCED by depreciation taken (the depreciation deductions claimed must come back to the IRS as recapture)." },
              { value: 300000, indicates: "Computed only the capital gain portion, missing the §1250 recapture component." },
            ],
          },
          {
            type: "COMPUTATION", id: "d11_comp_121_exclusion",
            title: "§121 Home Sale Exclusion Math",
            topicTags: ["section_121"],
            prompt: "MFJ couple bought home in 2015 for $400k. Lived in it as primary residence continuously. Made $50k improvements over the years. Sells in 2024 for $1,250,000 net. They've never used the §121 exclusion before. Compute the TAXABLE capital gain after applying §121.",
            expectedAnswer: 300000,
            tolerance: 100,
            unit: "dollars",
            formLine: "Schedule D + Form 8949",
            workedSolution: [
              "Step 1: Adjusted basis = $400k purchase + $50k improvements = $450,000",
              "Step 2: Total realized gain = $1,250,000 − $450,000 = $800,000",
              "Step 3: Apply §121 exclusion. MFJ ownership test (owned 2 of 5 years — yes), use test (used as principal residence 2 of 5 years — yes). Both spouses qualify. Maximum exclusion = $500,000.",
              "Step 4: Taxable gain after exclusion = $800,000 − $500,000 = $300,000 (long-term capital gain)",
              "Step 5: At MFJ income at this level, taxed at 20% federal + 3.8% NIIT (if MAGI threshold met) = ~24% combined = ~$72k federal tax",
              "Important: The exclusion is per-sale of principal residence, not per-year. Once used, generally not available again for 2 years. Single $250k / MFJ $500k cap is statutory and not indexed.",
            ],
            commonWrongAnswers: [
              { value: 800000, indicates: "Forgot to apply §121 exclusion entirely." },
              { value: 550000, indicates: "Used $250k single exclusion instead of $500k MFJ." },
              { value: 750000, indicates: "Forgot to subtract improvements from basis." },
            ],
          },
          {
            type: "SCENARIO_BRANCHING", id: "d11_scenario_121_trap",
            title: "The §121 Recapture Trap",
            topicTags: ["section_121", "recapture", "depreciation"],
            context: "Client emails: 'Selling my house. Lived in it 2008-2024. From 2018-2022 I rented it out (5 years). Moved back in 2022. Sale price $850k, bought for $300k, took $40k of depreciation during the rental period. I read I get the $500k §121 exclusion since I lived in it 2 of last 5 years. Free money, right?' Walk the conversation.",
            decisions: [
              {
                id: "dec1", prompt: "What's the FIRST clarification you make?",
                options: [
                  { text: "Confirm: yes, you qualify for §121 — both ownership and use tests met, full $500k MFJ exclusion applies, you can exclude up to $500k of gain", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_overpromise" },
                  { text: "Acknowledge §121 applies but flag the §121(d)(6) issue: depreciation recapture taken after May 6, 1997 is NOT excludable. The $40k of depreciation must be recognized as unrecaptured §1250 gain regardless of how long you lived there.", weight: 3, correctness: "great", nextId: "dec2", terminalId: null },
                  { text: "Tell them to disclose only their cost basis since they don't have records of depreciation", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_dishonest" },
                  { text: "Tell them they don't qualify because they rented it out", weight: 1, correctness: "risky", nextId: null, terminalId: "t_overcautious" },
                ],
              },
              {
                id: "dec2", prompt: "Client asks: 'OK so what's my actual tax?'",
                options: [
                  { text: "Realized gain = $850k − $300k − $0 (no improvements mentioned, but ASK to confirm) = $550k. Plus the $40k depreciation reduces basis (technically you should have already accounted for it). Total gain = ~$590k. §121 excludes $500k of capital gain. Remaining $50k of capital gain (above the cap) PLUS the $40k of unrecaptured §1250 gain = $90k taxable. Capital gain at 20% = $10k. Unrecaptured §1250 at 25% = $10k. Total federal ≈ $20k + state. Versus their assumption of $0 — significant misalignment.", weight: 3, correctness: "great", nextId: null, terminalId: "t_great" },
                  { text: "Just the $40k of depreciation is taxable at 25%, total tax ~$10k", weight: 2, correctness: "acceptable", nextId: null, terminalId: "t_partial" },
                  { text: "Zero — full §121 exclusion applies", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_overpromise" },
                ],
              },
            ],
            terminals: [
              { id: "t_great", label: "Pro §121 Conversation", outcome: "great", coachingNote: "Three teaching points: (1) §121(d)(6) is the 'depreciation trap' — clients who rented their home out at any point between 1997-now will have depreciation that doesn't get excluded under §121, even if they qualify for the full exclusion. (2) Without good records, you're stuck with whatever depreciation WAS allowable (whether or not actually taken) — the IRS doesn't let clients off for poor recordkeeping. (3) The recapture ($40k @ 25%) is at a HIGHER rate than the long-term cap gain (20%), so the recapture portion is the more painful tax even though it sounds smaller." },
              { id: "t_overpromise", label: "Overpromised Exclusion", outcome: "harmful", coachingNote: "§121(d)(6) explicitly says the exclusion 'shall not apply to so much of the gain... as does not exceed the depreciation adjustments... attributable to periods after May 6, 1997.' Telling a client they get full exclusion when they have prior depreciation is malpractice-territory. They'll get an IRS notice 18 months after filing." },
              { id: "t_dishonest", label: "Dishonest Approach", outcome: "harmful", coachingNote: "Failing to recognize depreciation that should have been claimed is not optional under §1016(a)(2). Adjusted basis must be reduced by depreciation 'allowed or allowable' — meaning even depreciation NOT taken still reduces basis. You cannot simply omit it. Hard ethical line." },
              { id: "t_overcautious", label: "Overcautious", outcome: "risky", coachingNote: "Renting out a property doesn't disqualify §121 outright — the test is 2 of 5 years owned AND 2 of 5 years used as principal residence. If they lived there 2008-2018 (10 years) and 2022-2024 (2 years) and rented 2018-2022 (5 years), they easily meet both tests in the 2024 sale year. The §121 exclusion applies; the recapture portion is the only carve-out." },
              { id: "t_partial", label: "Partial Credit", outcome: "acceptable", coachingNote: "You caught the §121(d)(6) recapture issue — good. But you missed that the $550k realized gain exceeds the $500k exclusion cap by $50k. That excess is also taxable as long-term capital gain, separate from the recapture. Total = $50k cap gain + $40k unrecaptured §1250 = $90k taxable, not just $40k." },
            ],
          },
          {
            type: "CONFIDENCE_MCQ", id: "d11_mcq_121_tests",
            question: "To qualify for the full §121 exclusion, a taxpayer must satisfy:",
            options: [
              "Owned and used the home as principal residence for 5 consecutive years",
              "Owned the home for at least 2 of the 5 years preceding sale (Ownership Test) AND used it as principal residence for at least 2 of the 5 years preceding sale (Use Test) — the 2 years need not be the same 2 years",
              "Owned the home outright (no mortgage)",
              "Used the home only as a primary residence with no rental activity ever",
            ],
            correct: 1,
            topicTags: ["section_121"],
            difficulty: 3,
            explanation: "§121(a) requires both the ownership test (2 of 5 years owned) AND the use test (2 of 5 years used as principal residence). Importantly, the 2-year periods can overlap or not — they do not need to be the same 2 years. So someone who owned a property 2018-2024 (6 years owned) and used it as residence 2018-2020 (2 years), then rented it 2020-2023, then moved back 2023-2024 — they meet both tests in 2024. Common error: assuming the 2 years must be consecutive AND must be the same 2 years for both tests.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d11_mcq_unrecaptured_1250",
            question: "What is 'unrecaptured §1250 gain' and what's its federal tax rate?",
            options: [
              "Recapture of all depreciation on real property; taxed at ordinary rates up to 37%",
              "The portion of gain on sale of real property attributable to depreciation taken (not in excess of straight-line); taxed at a maximum federal rate of 25%",
              "Depreciation taken in excess of straight-line on real property; taxed at ordinary rates",
              "Gain on sale of real property held under 1 year; taxed at short-term rates",
            ],
            correct: 1,
            topicTags: ["recapture", "depreciation"],
            difficulty: 4,
            explanation: "§1250 actually has TWO components: (1) §1250 recapture proper — applies to real property depreciated using methods FASTER than straight-line; the excess depreciation is recaptured at ordinary rates. For most modern real property (residential and nonresidential after 1986), this is zero because they're depreciated SL. (2) Unrecaptured §1250 gain — the SL depreciation portion of the gain. This is taxed at a maximum federal rate of 25% (per §1(h)(1)(D)), which is HIGHER than the typical 20% long-term capital gains rate. Critical: even though the property was depreciated SL, that depreciation still 'comes back' on sale at a 25% rate, not a 20% rate.",
          },
        ],
      },
      {
        id: "d12", title: "Day 17 — Depreciation Recapture: §1245 vs §1250",
        description: "Recapture is where cost segregation comes back to bite — or doesn't, depending on planning. Today: §1245 ordinary recapture on personal property components, §1250 unrecaptured gain on real property, and the strategic implications for clients who've done cost seg studies.",
        topicTags: ["recapture", "depreciation", "cost_seg_basics", "basis"],
        learningObjectives: [
          "Distinguish §1245 property (tangible personal property: 5/7-year cost-seg components, FF&E) from §1250 property (real property: building structure, land improvements)",
          "Apply §1245 recapture: ordinary income up to total depreciation taken (no rate cap)",
          "Apply §1250 unrecaptured gain: the SL depreciation portion of real property gain, taxed at max 25% federal",
          "Identify how cost segregation INCREASES §1245 exposure (more 5/7-year property classified as §1245)",
          "Recognize the recapture interaction with §121 (excluded gain doesn't shield recapture under §121(d)(6)) and 1031 (§1245 generally cannot be deferred)",
        ],
        tasks: [
          { id: "d12t1", text: "Read IRC §1245 and §1250 in full" },
          { id: "d12t2", text: "Read Reg. §1.1245-1 and §1.1250-1" },
          { id: "d12t3", text: "Read Form 4797 Instructions — focus on Part III (Sale of Recapture Property)" },
          { id: "d12t4", text: "Practice: For a property with cost seg components, compute §1245 vs §1250 recapture on sale" },
          { id: "d12t5", text: "Read Aiola's Recapture worksheet (TODO_NICK: link to firm SOP)" },
        ],
        resources: [
          { label: "IRC §1245", url: "https://www.law.cornell.edu/uscode/text/26/1245" },
          { label: "IRC §1250", url: "https://www.law.cornell.edu/uscode/text/26/1250" },
          { label: "Form 4797 Instructions", url: "https://www.irs.gov/pub/irs-pdf/i4797.pdf" },
          { label: "Form 4797 (blank)", url: "https://www.irs.gov/pub/irs-pdf/f4797.pdf" },
          { label: "Aiola Recapture Worksheet", url: null /* TODO_NICK */ },
        ],
        assessment: [
          {
            type: "DRAG_EXERCISE", id: "d12_match_recapture_property",
            title: "Property Type → Recapture Category",
            topicTags: ["recapture", "cost_seg_basics"],
            prompt: "Match each property component to its recapture treatment on sale.",
            mode: "match",
            pairs: [
              { a: { id: "p1", label: "5-year carpet from cost seg study" }, b: { id: "r_1245", label: "§1245 — ordinary income recapture up to depreciation taken" } },
              { a: { id: "p2", label: "Building structure (residential rental, 27.5-year)" }, b: { id: "r_1250", label: "§1250 unrecaptured gain — max 25% federal rate" } },
              { a: { id: "p3", label: "Land" }, b: { id: "r_cap", label: "Long-term capital gain — max 20% federal + NIIT" } },
              { a: { id: "p4", label: "15-year land improvements (parking, fencing) from cost seg" }, b: { id: "r_1245_li", label: "§1245 — ordinary income recapture (yes, despite 'land improvements' being depreciable real-ish property, the 15-year cost-seg components are §1245 personal property for recapture purposes)" } },
            ],
            decoys: [],
            explanation: "The recapture math is asymmetric. Cost seg accelerates depreciation upfront (good) but pushes more property into §1245 (which recaptures at ordinary rates up to 37%, not the 25% §1250 cap). At a high marginal rate, the §1245 recapture is more painful than §1250. This is why some clients who plan to hold long-term (or hold-til-death-then-step-up) benefit MORE from cost seg than clients who plan to sell in 5 years.",
          },
          {
            type: "COMPUTATION", id: "d12_comp_recapture_split",
            title: "Recapture Split on Cost-Segregated Property Sale",
            topicTags: ["recapture", "cost_seg_basics", "depreciation"],
            prompt: "Client bought rental in 2020 for $1,000,000 ($200k land, $800k building). Did cost seg in 2020: $640k stayed at 27.5-year, $80k as 15-year, $80k as 5-year. Year-1 bonus depreciation took $80k (5-yr) + $80k (15-yr) immediately. Total depreciation through 2024: $640k @ 27.5-yr SL × 4.5 years ≈ $105k, + the full $80k bonus on 5-yr, + the full $80k bonus on 15-yr = $265k accumulated depreciation. Sells in 2025 for $1,400,000 (net of selling costs). Compute the TOTAL realized gain.",
            expectedAnswer: 665000,
            tolerance: 200,
            unit: "dollars",
            formLine: "Form 4797",
            workedSolution: [
              "Step 1: Adjusted basis = $1,000,000 − $265,000 = $735,000",
              "Step 2: Realized gain = $1,400,000 − $735,000 = $665,000 (this is the answer being asked)",
              "Step 3: Allocate the $665k gain among the three categories:",
              "Step 3a: §1245 recapture = depreciation on the §1245 components, capped at gain on those components. The 5-yr ($80k) and 15-yr cost-seg components ($80k) generated $160k of depreciation. If the sale price allocates $80k+$80k = $160k to those reclassified components and they have $0 remaining basis (fully depreciated via bonus), the recapture is $160k of ordinary income.",
              "Step 3b: Unrecaptured §1250 gain = SL depreciation on the building portion = $105,000. Taxed at max 25% federal.",
              "Step 3c: Remaining gain = $665,000 − $160,000 − $105,000 = $400,000 long-term capital gain. Taxed at max 20% + NIIT.",
              "Tax impact at 37% / 25% / 20%: ($160k × 37%) + ($105k × 25%) + ($400k × 20%) = $59,200 + $26,250 + $80,000 = $165,450 federal.",
              "If client hadn't done cost seg, the entire $265k depreciation would be unrecaptured §1250 ($105k + $160k that would have been SL on the same components had they been classified as 27.5-yr) — taxed at 25%, not split with §1245 at 37%. The cost seg upfront benefit (~$50k+ year-1 federal savings) is partly clawed back at exit.",
              "STRATEGIC TAKEAWAY: Cost seg + sale within 5-7 years often nets out small. Cost seg + long hold + step-up at death = pure benefit. Cost seg + 1031 exchange = §1245 portion can't defer.",
            ],
            commonWrongAnswers: [
              { value: 400000, indicates: "Computed only the long-term capital gain portion." },
              { value: 265000, indicates: "Confused total depreciation with total gain." },
              { value: 1135000, indicates: "Forgot to subtract basis from sale price." },
            ],
          },
          {
            type: "CONFIDENCE_MCQ", id: "d12_mcq_1245_rate",
            question: "§1245 depreciation recapture is taxed at:",
            options: [
              "20% maximum federal capital gains rate",
              "25% maximum federal rate (same as unrecaptured §1250)",
              "ORDINARY income rates — no preferential cap, can be up to 37% federal at high income brackets",
              "0% — recapture is deferred until basis runs out",
            ],
            correct: 2,
            topicTags: ["recapture"],
            difficulty: 3,
            explanation: "§1245 recapture is recharacterized as ORDINARY INCOME up to the lesser of (a) depreciation taken or (b) gain realized. There is no rate cap — at high income, this means the marginal rate (up to 37%) plus state. This is why §1245 (cost-segregated personal property components) is harder to plan around than §1250 (the underlying real property structural component, capped at 25%). The asymmetry between §1245 and §1250 is a core consideration in cost seg / 1031 planning.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d12_mcq_1031_recapture",
            question: "A client did a cost seg study on their rental property in 2022. Now they want to do a 1031 exchange in 2025 to defer all gain. What's the issue?",
            options: [
              "No issue — 1031 defers all gain regardless of recapture type",
              "1031 generally cannot defer §1245 recapture on the cost-segregated components (5/7/15-year property) — only the §1250 (real property structure) portion defers. The 5/7-year components are §1245 personal property, which post-TCJA is no longer like-kind to real property.",
              "1031 only defers §1245 recapture; §1250 must be recognized",
              "1031 doesn't apply to property over $1M",
            ],
            correct: 1,
            topicTags: ["recapture", "cost_seg_basics", "section_1031"],
            difficulty: 5,
            explanation: "Post-TCJA (2018), §1031 like-kind exchange treatment is limited to REAL PROPERTY for real property only. The 5/7/15-year components reclassified by cost seg are §1245 personal property under the recapture rules — they cannot be exchanged tax-free for real property. So when the client 1031s the building, they recognize §1245 recapture on the cost-segregated personal property components. The §1250 (building structure) portion can defer. For a heavily cost-segregated property, this can mean meaningful current tax even with a 1031. Aiola needs to model this BEFORE the cost seg study is done — clients with planned 5-7 year holds may not benefit as much as expected.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d12_mcq_form_4797",
            question: "Sale of business or rental real estate gets reported on which form?",
            options: [
              "Schedule D Form 8949",
              "Form 4797 (Sales of Business Property), with capital gain portion flowing to Schedule D",
              "Schedule E directly",
              "Form 4562",
            ],
            correct: 1,
            topicTags: ["recapture"],
            difficulty: 2,
            explanation: "Form 4797 is the primary vehicle for sale of business or rental property. Part I = §1231 long-term gains/losses. Part II = ordinary gains/losses. Part III = recapture computations under §1245, §1250, §1252, §1254, §1255. The net §1231 gain (after recapture is carved out as ordinary) flows to Schedule D as long-term capital gain. Schedule D / Form 8949 alone is for non-business capital assets (stocks, personal residence under §121, etc.). Always use 4797 for rental property sales.",
          },
        ],
      },
      {
        id: "d13", title: "Day 18 — 1031 Like-Kind Exchange",
        description: "1031 exchanges are how sophisticated real estate investors compound — defer gain, redeploy capital, repeat. Today: the 45/180-day mechanics, identification rules, qualified intermediary requirement, boot recognition, and the post-TCJA limitation to real property only.",
        topicTags: ["section_1031", "recapture"],
        learningObjectives: [
          "Explain the 1031 framework: defer recognition of gain on exchange of like-kind property",
          "Apply the timing rules: 45-day identification window, 180-day exchange window, both starting from sale of relinquished property",
          "Identify the three identification methods: 3-property rule, 200% rule, 95% rule",
          "Recognize the qualified intermediary requirement (taxpayer cannot constructively receive proceeds)",
          "Compute boot recognition: gain recognized to the extent of boot received (cash or non-like-kind property)",
          "Apply post-TCJA limitation: like-kind = REAL property for real property only (personal property no longer qualifies)",
        ],
        tasks: [
          { id: "d13t1", text: "Read IRC §1031 in full — focus on (a) general rule, (a)(3) identification timing, (b) gain recognized on receipt of other property" },
          { id: "d13t2", text: "Read Reg. §1.1031(a)-1 and (b)-1 (Treasury implementation)" },
          { id: "d13t3", text: "Read IRS Pub 544 (Sales and Other Dispositions), Chapter 1" },
          { id: "d13t4", text: "Read about Qualified Intermediary requirements under Reg. §1.1031(k)-1(g)" },
          { id: "d13t5", text: "Practice: Walk through a 4-step 1031 timeline (sale, identification, exchange completion) with appropriate documents" },
          { id: "d13t6", text: "Read Aiola's 1031 client checklist (TODO_NICK: link)" },
        ],
        resources: [
          { label: "IRC §1031 (Cornell LII)", url: "https://www.law.cornell.edu/uscode/text/26/1031" },
          { label: "Reg. §1.1031(a)-1 (Like-kind property)", url: "https://www.law.cornell.edu/cfr/text/26/1.1031(a)-1" },
          { label: "Reg. §1.1031(k)-1 (Deferred exchanges + qualified intermediary)", url: "https://www.law.cornell.edu/cfr/text/26/1.1031(k)-1" },
          { label: "IRS Pub 544 (Sales and Other Dispositions)", url: "https://www.irs.gov/pub/irs-pdf/p544.pdf" },
          { label: "Form 8824 Instructions (Like-Kind Exchanges)", url: "https://www.irs.gov/pub/irs-pdf/i8824.pdf" },
          { label: "Form 8824 (blank)", url: "https://www.irs.gov/pub/irs-pdf/f8824.pdf" },
          { label: "Aiola 1031 Client Checklist", url: null /* TODO_NICK */ },
        ],
        assessment: [
          {
            type: "DRAG_EXERCISE", id: "d13_order_1031_timeline",
            title: "1031 Exchange Timeline",
            topicTags: ["section_1031"],
            prompt: "Drag these milestones into the correct chronological order for a deferred 1031 like-kind exchange.",
            mode: "order",
            items: [
              { id: "t1", label: "Engage Qualified Intermediary (QI) BEFORE closing on relinquished property" },
              { id: "t2", label: "Close on sale of relinquished property — proceeds go to QI, not taxpayer" },
              { id: "t3", label: "Day 0 begins: 45-day identification clock + 180-day exchange clock both start" },
              { id: "t4", label: "Within 45 days: deliver written identification of replacement property to QI" },
              { id: "t5", label: "Within 180 days (or due date of return, whichever is earlier): close on replacement property" },
              { id: "t6", label: "QI delivers replacement property to taxpayer; report exchange on Form 8824" },
            ],
            correctSequence: ["t1", "t2", "t3", "t4", "t5", "t6"],
            explanation: "The QI engagement BEFORE closing is non-negotiable — if the taxpayer 'constructively receives' the proceeds (e.g., a check made out to them), the exchange fails and the entire gain is recognized. The 45-day identification deadline is hard — no extensions. The 180-day exchange deadline is also hard — and is shortened to the due date of the return if the return is due first (so a Q4 sale needs special attention). Document everything; Form 8824 is the IRS reporting form.",
          },
          {
            type: "COMPUTATION", id: "d13_comp_boot_recognition",
            title: "Boot Recognition in a 1031 Exchange",
            topicTags: ["section_1031"],
            prompt: "Client sells relinquished property for $800,000 net (basis $300k, $500k gain). Acquires replacement property worth $700,000 in a properly structured 1031. The QI returns $100,000 in cash to the client (didn't fully reinvest). How much gain must be RECOGNIZED currently?",
            expectedAnswer: 100000,
            tolerance: 0,
            unit: "dollars",
            formLine: "Form 8824",
            workedSolution: [
              "Step 1: Total realized gain on relinquished property = $500,000",
              "Step 2: Boot received = $100,000 (cash returned to taxpayer)",
              "Step 3: Gain recognized = LESSER of (a) realized gain $500k, or (b) boot received $100k = $100,000",
              "Step 4: Remaining $400k of realized gain is DEFERRED under §1031.",
              "Step 5: Adjusted basis in replacement property = $300k (old basis) + $100k (gain recognized) − $0 (no boot given) − $100k (boot received) = $300k. The deferred $400k of gain is preserved as a low basis in the replacement property.",
              "Strategic note: To fully defer all gain, replacement property must be of EQUAL OR GREATER value AND mortgage debt must be at least as much (debt relief on the relinquished side counts as boot received).",
            ],
            commonWrongAnswers: [
              { value: 0, indicates: "Assumed full deferral — but boot received always triggers gain recognition up to amount of boot." },
              { value: 500000, indicates: "Treated as a fully taxable sale — boot recognition is limited to amount of boot, not full gain." },
              { value: 200000, indicates: "Doubled the boot — only the actual cash received is boot." },
            ],
          },
          {
            type: "CONFIDENCE_MCQ", id: "d13_mcq_45_180",
            question: "The 45-day identification window and 180-day exchange window in a deferred 1031 both START from:",
            options: [
              "The date the replacement property is identified",
              "The date the relinquished property is sold/closed (Day 0)",
              "The date the QI is engaged",
              "January 1 of the year of the sale",
            ],
            correct: 1,
            topicTags: ["section_1031"],
            difficulty: 2,
            explanation: "Both clocks start on the same day — the date of closing on the relinquished property (Day 0 in tax parlance). 45 days to IDENTIFY replacement property in writing to the QI. 180 days (or due date of return, whichever is EARLIER) to CLOSE on replacement. Both windows are hard deadlines under §1031(a)(3) — IRS does not grant extensions absent disaster relief proclamations. Critical for Q4 sales: a December sale has 45 days through mid-February, but the 180-day window is shortened to April 15 (return due date) if not extended — far less than 180 days. Always file an extension to preserve the full 180.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d13_mcq_id_methods",
            question: "Under the 1031 identification rules within the 45-day window, a taxpayer can identify replacement properties using which methods?",
            options: [
              "Only the 3-property rule (up to 3 candidate properties)",
              "Three methods: (1) 3-property rule (up to 3 properties of any value), (2) 200% rule (any number of properties as long as total FMV ≤ 200% of relinquished FMV), (3) 95% rule (any number of properties, but must close on 95%+ of identified value)",
              "Unlimited identification with no FMV constraint",
              "Only one property can be identified",
            ],
            correct: 1,
            topicTags: ["section_1031"],
            difficulty: 4,
            explanation: "Per Reg. §1.1031(k)-1(c)(4): three identification methods. The 3-property rule is most common — identify up to 3 properties, no FMV cap, close on whichever you want. The 200% rule allows more candidates but caps total identified FMV at 200% of relinquished FMV. The 95% rule allows unlimited identification but requires actually closing on 95%+ of identified value (rare, used in delayed multi-property transactions). Aiola advisors should know all three but typically recommend the 3-property rule for simplicity.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d13_mcq_post_tcja",
            question: "Post-TCJA (2018), 1031 like-kind exchange treatment is limited to:",
            options: [
              "Both real and personal property, like before",
              "REAL property exchanged for real property only — personal property (vehicles, equipment, art) no longer qualifies",
              "Only residential real estate",
              "Only commercial real estate",
            ],
            correct: 1,
            topicTags: ["section_1031"],
            difficulty: 3,
            explanation: "TCJA (effective 1/1/2018) limited §1031 like-kind treatment to real property for real property only. Personal property (vehicles, art, equipment, livestock, collectibles) no longer qualifies. This affects: (1) cost seg interaction — the 5/7-year personal property components from a cost seg study cannot be 1031-deferred; only the real property structural component can. (2) Trade-ins of business equipment — used to qualify as 1031, now generate gain or loss on the trade-in side. Real estate investors are largely unaffected for the building-only side, but cost seg planning needs to account for the §1245 portion not deferring.",
          },
        ],
      },
      {
        id: "d14", title: "Day 19 — Entity Structures for Real Estate",
        description: "Now that we've covered gain on sale, recapture, and 1031, layer in the entity structure question. Building on this week's sale and recapture mechanics: rentals go in LLCs, not S-Corps. Today reinforces that with the §1402(a)(1) and §311(b) reasoning.",
        topicTags: ["llc", "s_corp", "entity_election", "partnership_taxation", "rental_classification", "basis"],
        learningObjectives: [
          "Match each entity structure (SMLLC, multi-member LLC, S-Corp, C-Corp) to its best real estate use case",
          "Articulate the two-part reason why rental real estate should NOT be in an S-Corp",
          "Explain disregarded entity treatment for single-member LLCs under Reg. §301.7701-3",
          "Recognize when transferring appreciated property to an SMLLC is a non-event vs a taxable event",
        ],
        tasks: [
          { id: "d14t1", text: "Read IRC §301.7701 and the check-the-box regulations" },
          { id: "d14t2", text: "Read about S-Corp election restrictions under §1361 (one-class-of-stock rule, eligibility)" },
          { id: "d14t3", text: "Review Aiola's Entity Decision Tree (TODO_NICK: link)" },
          { id: "d14t4", text: "Review the Rivera return — Alex's S-Corp question (preview tomorrow's scenario)" },
          { id: "d14t5", text: "Read about Wyoming and Delaware holding LLCs (TODO_NICK: firm preference)" },
        ],
        resources: [
          { label: "Reg. §301.7701 (Check-the-box)", url: "https://www.law.cornell.edu/cfr/text/26/301.7701-3" },
          { label: "IRC §1361 (S-Corp eligibility)", url: "https://www.law.cornell.edu/uscode/text/26/1361" },
          { label: "IRC §721 (Partnership contributions)", url: "https://www.law.cornell.edu/uscode/text/26/721" },
          { label: "Aiola Entity Decision Tree", url: null /* TODO_NICK */ },
          { label: "Rivera 2024 Return", url: "/docs/Rivera_2024_Federal_Return.pdf" },
        ],
        assessment: [
          {
            type: "DRAG_EXERCISE", id: "w3_match_entity_use",
            title: "Entity Type → Best Real Estate Use Case",
            topicTags: ["llc", "s_corp", "entity_election", "partnership_taxation"],
            prompt: "Match each entity structure to its most appropriate real estate use case.",
            mode: "match",
            pairs: [
              { a: { id: "single_llc", label: "Single-Member LLC (disregarded)" }, b: { id: "use_solo_rental", label: "Solo investor's rental property — keeps Schedule E reporting, adds liability protection" } },
              { a: { id: "multi_llc", label: "Multi-Member LLC (partnership)" }, b: { id: "use_partnership", label: "Two or more investors holding rental real estate together" } },
              { a: { id: "scorp", label: "S-Corp election (on an LLC or corp)" }, b: { id: "use_active_biz", label: "Active service business with stable profit > ~$80k (consulting, brokerage, flipping operation)" } },
              { a: { id: "ccorp", label: "C-Corp" }, b: { id: "use_ccorp", label: "Generally NOT recommended for real estate — double taxation, distribution gain on real estate" } },
            ],
            decoys: [],
            explanation: "The cardinal rule: rental real estate goes in LLCs (single or multi-member), NOT S-Corps and NOT C-Corps. S-Corp is the right tool for ACTIVE service income above ~$80k stable. C-Corp is rarely right for real estate because of the appreciation-trap problem (gain on distribution under §311(b)) compounded with double taxation.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d14_mcq_smllc_default",
            question: "A solo investor forms a single-member LLC to hold a rental property. By default, how is this LLC treated for federal tax purposes?",
            options: [
              "As a separate corporation",
              "As a disregarded entity — the LLC is ignored for federal tax purposes; rental income/loss flows directly to the owner's Schedule E",
              "As a partnership",
              "As an S-Corporation",
            ],
            correct: 1,
            topicTags: ["llc", "pass_through"],
            difficulty: 2,
            explanation: "Per Reg. §301.7701-3 (the 'check-the-box' regs), a single-member LLC defaults to disregarded entity treatment. The LLC provides legal liability protection but has no separate federal tax existence — the owner reports rental on Schedule E directly. The LLC can elect S-Corp status via Form 2553 (rarely advisable for rentals — tomorrow covers this). Multi-member LLCs default to partnership treatment unless they elect otherwise.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d14_mcq_llc_appreciation",
            question: "A client wants to transfer a $500k appreciated rental property (basis $200k) from personal name into a single-member LLC. What's the federal tax consequence?",
            options: [
              "Gain of $300k recognized on the transfer",
              "No federal tax consequence — transfer to a disregarded SMLLC is not a recognition event because the LLC is not a separate entity for federal tax purposes",
              "Step-up in basis to FMV",
              "Triggers depreciation recapture",
            ],
            correct: 1,
            topicTags: ["llc", "basis"],
            difficulty: 3,
            explanation: "Transfer to an SMLLC owned 100% by the same taxpayer = no recognition event federally because the LLC is disregarded. Original basis carries over. Title moves; tax position doesn't. Important caveats: (1) Some states impose transfer taxes on the deed change. (2) Lender consent may be required if there's a mortgage (technically a transfer of title). (3) Multi-member LLC transfers ARE potentially recognition events — check Reg. §1.721-1 contributions to partnerships.",
          },
        ],
      },
      {
        id: "d15", title: "Day 20 — The Alex Rivera S-Corp Decision + QBI + Week Wrap",
        description: "Day 20 is the entity application day. The full Alex Rivera S-Corp scenario IS the centerpiece — engage with each branch carefully (30+ min). Then layer in §199A QBI fundamentals to round out the entity discussion.",
        topicTags: ["s_corp", "reasonable_comp", "entity_election", "se_tax", "pass_through", "qbi", "rental_classification"],
        learningObjectives: [
          "Walk through a complete S-Corp advisory conversation: scoping, reasonable comp, savings sizing, and the rental trap",
          "Compute SE tax on Schedule C and compare to FICA on S-Corp wages",
          "Articulate §199A QBI at a working level: 20% deduction, SSTB rules, and the rental real estate safe harbor",
          "Synthesize entity structure, SE tax, and QBI concepts into a coherent advisory framework",
        ],
        tasks: [
          { id: "d15t1", text: "Complete the Alex Rivera S-Corp scenario — engage with EACH terminal outcome carefully" },
          { id: "d15t2", text: "Submit a written analysis of whether Alex should elect S-Corp for 2025 to your manager via ClickUp" },
          { id: "d15t3", text: "Read the IRS Fact Sheet: Wage Compensation for S-Corp Officers" },
          { id: "d15t4", text: "Read Rev. Proc. 2019-38 for the rental real estate QBI safe harbor" },
          { id: "d15t5", text: "30-min Friday wrap-up call with your Manager to discuss the week" },
        ],
        resources: [
          { label: "IRC §1402(a)(1) (Rents excluded from SE)", url: "https://www.law.cornell.edu/uscode/text/26/1402" },
          { label: "IRC §311(b) (Distribution of appreciated property)", url: "https://www.law.cornell.edu/uscode/text/26/311" },
          { label: "IRC §199A (QBI)", url: "https://www.law.cornell.edu/uscode/text/26/199A" },
          { label: "Rev. Proc. 2019-38 (Rental RE safe harbor)", url: "https://www.irs.gov/pub/irs-drop/rp-19-38.pdf" },
          { label: "IRS Wage Compensation for S-Corp Officers", url: "https://www.irs.gov/businesses/small-businesses-self-employed/wage-compensation-for-s-corporation-officers" },
          { label: "Rivera 2024 Return", url: "/docs/Rivera_2024_Federal_Return.pdf" },
        ],
        assessment: [
          {
            type: "SCENARIO_BRANCHING", id: "w3_scenario_alex_scorp",
            title: "Should Alex Rivera Elect S-Corp for 2025?",
            topicTags: ["s_corp", "reasonable_comp", "entity_election", "se_tax"],
            context: "Alex Rivera runs a consulting business currently filed on Schedule C. Per his 2024 return: net Schedule C income $145,000, ~30 hours/week worked on the business, residence in Florida (no state income tax), 3-year stable income trend. He emails on a Tuesday: 'My buddy said I should be doing an S-Corp to save on taxes. Can we set that up for 2025?' How do you handle this conversation?",
            decisions: [
              {
                id: "dec1", prompt: "What's your FIRST move?",
                options: [
                  { text: "Recommend S-Corp election immediately — at $145k net he's leaving SE tax savings on the table", weight: 1, correctness: "risky", nextId: null, terminalId: "t_premature" },
                  { text: "Ask follow-up questions: state of residence, projected stability of income, willingness to run payroll, other entities, retirement plan goals", weight: 3, correctness: "great", nextId: "dec2", terminalId: null },
                  { text: "Recommend against because S-Corp adds compliance complexity", weight: 1, correctness: "risky", nextId: null, terminalId: "t_undercoaching" },
                  { text: "Tell him to talk to a business attorney first", weight: 1, correctness: "risky", nextId: null, terminalId: "t_deflect" },
                ],
              },
              {
                id: "dec2", prompt: "He confirms FL (no state tax), stable income last 3 years, willing to do payroll, no other entities, currently no retirement plan. What's your reasonable comp anchor?",
                options: [
                  { text: "50% of net income → $72,500 (rule of thumb)", weight: 1, correctness: "risky", nextId: null, terminalId: "t_arbitrary_comp" },
                  { text: "Pull RCReports or BLS data for 'Management Consultants' in his region — likely $90k–$110k range", weight: 3, correctness: "great", nextId: "dec3", terminalId: null },
                  { text: "$50,000 to maximize distributions and SE savings", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_aggressive_comp" },
                  { text: "Whatever Alex wants to pay himself", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_no_comp" },
                ],
              },
              {
                id: "dec3", prompt: "Anchoring at $95,000 reasonable comp on $145,000 net income, what's the approximate SE tax savings vs Schedule C? (Rough order of magnitude.)",
                options: [
                  { text: "About $15,000 — 15.3% × $50k diff with no offset", weight: 1, correctness: "risky", nextId: null, terminalId: "t_overstated" },
                  { text: "About $4,000–$7,000 — savings on the SE-tax portion of the $50k diff, accounting for SS wage base interactions and the deduction for half of SE tax", weight: 3, correctness: "great", nextId: "dec4", terminalId: null },
                  { text: "About $22,000 — full 15.3% × full $145k", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_overstated" },
                  { text: "Zero — there's no SE tax savings", weight: 1, correctness: "risky", nextId: null, terminalId: "t_understated" },
                ],
              },
              {
                id: "dec4", prompt: "Alex asks: 'Wait, my friend said his S-Corp also saved him on his rental properties. Can I put my rentals into the S-Corp too?'",
                options: [
                  { text: "Yes, putting rentals in an S-Corp adds another layer of SE tax savings", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_rental_scorp_bad" },
                  { text: "No — rental income is NOT subject to SE tax to begin with under IRC §1402(a)(1), so there's no SE tax to save. Worse, putting appreciated real estate INTO an S-Corp can trigger gain on later distribution. Keep rentals in LLCs (or held directly), separate from the S-Corp.", weight: 3, correctness: "great", nextId: null, terminalId: "t_great" },
                  { text: "It depends on whether the rental is short-term or long-term", weight: 1, correctness: "risky", nextId: null, terminalId: "t_partial_credit" },
                  { text: "Yes, but only for short-term rentals", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_rental_scorp_bad" },
                ],
              },
            ],
            terminals: [
              { id: "t_great", label: "Pro-Level Advisory", outcome: "great", coachingNote: "Textbook. You scoped the conversation, anchored reasonable comp on defensible data, sized the savings accurately, AND caught the rental trap. Three teaching points to remember: (1) Reasonable comp uses RCReports/BLS — never percentages. (2) SE tax savings are smaller than the napkin math suggests because of SS wage base interactions and the deduction for half of SE tax. (3) S-Corp does NOT help rentals — rental income isn't subject to SE tax under §1402(a)(1), and putting appreciated real estate into an S-Corp creates exit problems. The output of this conversation is a memo: 'Recommend S-Corp election effective 1/1/2025, reasonable comp ~$95k anchored on RCReports lookup, projected SE tax savings ~$4–7k, additional admin cost ~$1.5–2k/yr (payroll provider + 1120-S return). Rentals to remain in LLC structure, separate from S-Corp.'" },
              { id: "t_premature", label: "Premature Recommendation", outcome: "risky", coachingNote: "Recommending S-Corp without scoping is a rookie move. State (FL = no state benefit, but in CA the franchise tax matters), income stability (S-Corp election locks you in for 5 years before re-election), willingness to run payroll, retirement plan strategy, and other entities all matter. The recommendation IS probably right for Alex — but you can't know that without asking." },
              { id: "t_undercoaching", label: "Undercoaching", outcome: "risky", coachingNote: "S-Corp does add complexity, but at $145k of stable consulting income in a no-state-tax state, the math very likely works. Defaulting to 'too complex' undersells the strategy. Aiola's job is to evaluate, not avoid." },
              { id: "t_deflect", label: "Pure Deflection", outcome: "risky", coachingNote: "Entity election is squarely a CPA conversation. An attorney would handle the LLC formation; the S-Corp election (Form 2553) and reasonable comp determination is your lane. Punting to an attorney suggests you don't know the play — and clients notice." },
              { id: "t_arbitrary_comp", label: "Arbitrary Percentage", outcome: "risky", coachingNote: "The IRS does not accept '50% rule of thumb.' Reasonable comp must be supportable based on what a third party would pay for the services rendered. RCReports and BLS Occupational Employment data are the defensible tools. Arbitrary percentages are how clients get reclassification challenges — and you get a hard conversation with the client about back wages and penalties." },
              { id: "t_aggressive_comp", label: "Aggressive Comp", outcome: "harmful", coachingNote: "Setting comp artificially low to maximize distributions is the textbook IRS reclassification risk. The Watson v. Commissioner case (2012) is the cautionary tale — court reclassified $24k of comp into $91k. Never anchor a comp recommendation on 'maximize savings.' Always anchor on 'what would a third party pay for this work.'" },
              { id: "t_no_comp", label: "No Standard", outcome: "harmful", coachingNote: "'Whatever the client wants' is malpractice territory. The client engaged Aiola for the technical answer. Defer to Alex on lifestyle preferences (timing of distributions, etc.) but never on the technical reasonable comp determination." },
              { id: "t_overstated", label: "Overstated Savings", outcome: "risky", coachingNote: "The napkin '15.3% × distribution' calc overstates savings. Two reasons: (1) Above the SS wage base ($168,600 in 2024), the wage portion only saves Medicare (2.9%), not full 15.3%. (2) Schedule C filers get a deduction for half of SE tax (§164(f)), which reduces the apparent savings comparing apples to apples. At $145k income with $95k comp, true SE tax savings are typically in the $4k–$7k range, not $15k+. Overstating savings to clients is how trust gets broken later." },
              { id: "t_understated", label: "Understated Savings", outcome: "risky", coachingNote: "There ARE real SE tax savings on the wage/distribution split, even after accounting for the half-SE-tax deduction and SS wage base. Saying 'zero savings' suggests you don't understand the mechanics. Walk through the math: SE tax is 15.3% on net SE earnings; S-Corp wages get FICA on the wage portion only; distributions are not subject to SE tax." },
              { id: "t_rental_scorp_bad", label: "Wrong on Rentals", outcome: "harmful", coachingNote: "This is a critical teaching moment. Rental income is excluded from net earnings from self-employment under IRC §1402(a)(1) — there's no SE tax to begin with, so there's no SE tax to save. Worse: putting appreciated real estate INTO an S-Corp is a one-way door. Distributing real estate OUT of an S-Corp is a taxable event at FMV (§311(b)) — meaning you lock the appreciation into a corporate structure and trigger gain when the client wants to refinance, gift, or sell. Real estate goes in LLCs (single-member or partnership), never S-Corp. Memorize this — it's one of the most common mistakes new advisors make." },
              { id: "t_partial_credit", label: "Partial Credit", outcome: "risky", coachingNote: "STR vs LTR doesn't change the answer — the §1402(a)(1) exclusion for rents from real estate applies regardless of stay duration. (Substantial-services rentals reported on Schedule C are a different animal — they ARE subject to SE tax, but you'd never put those in an S-Corp either, for the same appreciation-trap reason.) Rentals stay out of S-Corps. Period." },
            ],
          },
          {
            type: "COMPUTATION", id: "w3_comp_se_tax_schedC",
            title: "SE Tax on Schedule C Income",
            topicTags: ["se_tax", "pass_through"],
            prompt: "A self-employed consultant has Schedule C net profit of $145,000 (no W-2 wages). Compute their self-employment tax for 2024. (Reminder: 2024 SS wage base = $168,600. SE tax rate = 15.3% [12.4% SS + 2.9% Medicare]. Self-employment income is multiplied by 92.35% before applying SE tax — that's the §1402(a)(12) deduction for the employer-equivalent portion.)",
            expectedAnswer: 20492,
            tolerance: 25,
            unit: "dollars",
            formLine: "Schedule SE",
            workedSolution: [
              "Step 1: Net SE earnings = $145,000 × 92.35% = $133,907.50",
              "Step 2: Both SS portion ($133,907.50 × 12.4%) and Medicare ($133,907.50 × 2.9%) apply since $133,907.50 < $168,600 SS wage base",
              "Step 3: SS portion = $133,907.50 × 0.124 = $16,604.53",
              "Step 4: Medicare portion = $133,907.50 × 0.029 = $3,883.32",
              "Step 5: Total SE tax = $16,604.53 + $3,883.32 = $20,487.85 (≈ $20,488)",
              "Note: Half of SE tax ($10,244) is deductible above the line under §164(f).",
              "Note: Additional Medicare Tax (0.9%) doesn't apply here since income is under $200k single.",
            ],
            commonWrongAnswers: [
              { value: 22185, indicates: "Forgot the 92.35% adjustment under §1402(a)(12)." },
              { value: 17980, indicates: "Used 12.4% only (forgot Medicare)." },
              { value: 4205, indicates: "Used Medicare only (forgot SS)." },
            ],
          },
          {
            type: "COMPUTATION", id: "w3_comp_scorp_savings",
            title: "Approximate S-Corp Tax Savings",
            topicTags: ["s_corp", "se_tax", "reasonable_comp"],
            prompt: "Same consultant. If they elect S-Corp for 2025 with reasonable comp of $95,000 (and the remaining $50,000 as a distribution), compute the approximate FICA tax on the W-2 wage portion. (Use 2024 rates as a proxy: 15.3% combined employee+employer on wages up to $168,600 — split 7.65% each side.)",
            expectedAnswer: 14535,
            tolerance: 25,
            unit: "dollars",
            formLine: "Form 941 + W-2",
            workedSolution: [
              "Step 1: Wage portion = $95,000.",
              "Step 2: Combined FICA (employee + employer) = $95,000 × 15.3% = $14,535.",
              "Step 3: Distribution of $50,000 has no FICA — that's the savings vs Schedule C.",
              "Step 4: Approximate SE tax savings: Schedule C SE tax (~$20,488 from prior block) − S-Corp FICA on wages ($14,535) = ~$5,953.",
              "Caveats: The actual comparison should also account for: (a) deduction of half of SE tax on Schedule C (§164(f)); (b) deduction of employer-paid FICA as an S-Corp expense; (c) 1120-S compliance cost (~$1,500–$2,500/yr); (d) §199A QBI: S-Corp wages count toward W-2 wages limitation, which can affect QBI for high earners. Net-net the savings here are real but smaller than the napkin math suggests — typically $4k–$7k at this income level.",
              "Important: This is the math. The conversation with the client is whether $5k of net savings justifies the compliance overhead. At $145k income — yes. At $80k — usually not worth it.",
            ],
            commonWrongAnswers: [
              { value: 7268, indicates: "Used only employee-side 7.65% — but the S-Corp pays both halves." },
              { value: 22185, indicates: "Computed SE tax on the original $145k — irrelevant to FICA on the wage portion." },
            ],
          },
          {
            type: "CONFIDENCE_MCQ", id: "w3_mcq_no_scorp_rental",
            question: "A client asks: 'Why can't I put my rental properties in an S-Corp to save on taxes like my consulting business?' What's the most accurate explanation?",
            options: [
              "You can put rentals in an S-Corp; it's actually a good idea for high-income clients",
              "Rental income is excluded from self-employment tax under §1402(a)(1) — there's no SE tax to save. Plus, distributing real estate OUT of an S-Corp triggers gain at FMV, locking appreciation into the structure",
              "S-Corps can't legally own real estate",
              "It depends on whether the rentals are short-term or long-term",
            ],
            correct: 1,
            topicTags: ["s_corp", "se_tax", "rental_classification"],
            difficulty: 4,
            explanation: "Two-part answer matters. (1) IRC §1402(a)(1) excludes rents from real estate from net earnings from SE — meaning rental income isn't subject to SE tax to begin with, so there's no SE tax for an S-Corp wage/distribution split to save. (2) §311(b) treats distribution of appreciated property as a sale at FMV — putting real estate INTO an S-Corp creates a one-way door where the client pays tax on the gain just to take the property back out. Both reasons mean LLCs (single-member disregarded or multi-member partnership) are the right structure for real estate.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "w3_mcq_reasonable_comp",
            question: "Which approach to determining S-Corp reasonable compensation is MOST defensible if the IRS challenges the wage/distribution split?",
            options: [
              "50% of net income — common rule of thumb",
              "Whatever the prior CPA recommended",
              "RCReports or BLS Occupational Employment Statistics data for the role/region, documented in the workpapers",
              "Whatever leaves the most cash for distributions",
            ],
            correct: 2,
            topicTags: ["reasonable_comp", "s_corp"],
            difficulty: 2,
            explanation: "The IRS standard is 'what would a third party pay for the services rendered' (see Watson v. Commissioner, 668 F.3d 1008 (8th Cir. 2012)). RCReports and BLS data are the defensible sources because they tie to actual wage data for comparable positions. Arbitrary percentages and 'maximize distributions' approaches lose in court. Aiola should document the methodology in workpapers — that's the difference between defending a reclassification challenge and losing one.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "w3_mcq_qbi_basics",
            question: "Under §199A (QBI), a non-SSTB pass-through business generates $100,000 of qualified business income. The owner is MFJ with taxable income of $250,000 (well below the 2024 phase-in threshold of $383,900). Without applying any wage or UBIA limitation, what's the QBI deduction?",
            options: [
              "$10,000 — 10% of QBI",
              "$20,000 — 20% of QBI",
              "$25,000 — 25% of QBI",
              "$0 — QBI doesn't apply at this income level",
            ],
            correct: 1,
            topicTags: ["qbi", "pass_through"],
            difficulty: 2,
            explanation: "§199A allows a 20% deduction on qualified business income for pass-through entities (sole prop, partnership, S-Corp). Below the 2024 MFJ phase-in threshold of $383,900, no W-2 wage or UBIA limitations apply for non-SSTB businesses — straight 20% × QBI. So $100k QBI × 20% = $20k deduction. Above the threshold, the W-2 wage and UBIA limitations kick in, and SSTBs (specified service trades or businesses) phase out entirely above $483,900 MFJ in 2024.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "w3_mcq_rental_qbi_safe_harbor",
            question: "A client has $40,000 of net rental income from one residential rental. Does this qualify for the §199A QBI deduction?",
            options: [
              "Yes, automatically — all rental income qualifies for QBI",
              "It depends — rental qualifies as a §162 trade or business OR if the Rev. Proc. 2019-38 safe harbor is met (250+ hours of rental services, separate books, contemporaneous logs)",
              "No, never — rental income is passive and excluded from QBI",
              "Only if the client is a real estate professional",
            ],
            correct: 1,
            topicTags: ["qbi", "rental_classification"],
            difficulty: 4,
            explanation: "Rental income qualifies for QBI only if the rental rises to a §162 trade or business OR meets the Rev. Proc. 2019-38 safe harbor. The safe harbor requires: (1) separate books and records for the rental enterprise, (2) 250+ hours of rental services per year (provided by owner, agents, or contractors), (3) contemporaneous time logs starting in 2020, (4) the safe harbor statement filed with the return. A single passive rental that the owner does little active work on usually does NOT qualify. This is a common missed deduction — and a real client conversation: 'are you tracking your hours? If yes, you might pick up a 20% deduction on the net rental income.' Note: REPS status is a §469 concept, separate from §199A — a real estate professional doesn't automatically get QBI on rentals.",
          },
        ],
      },
    ],
  },
  {
    id: "week5_8", label: "Weeks 5–8", subtitle: "Applied Advisory", phase: "Days 31–60",
    items: [
      {
        id: "d20", title: "Day 21 — Quarterly Tax Estimates + Week 5 Kickoff",
        description: "Quarterly tax estimates are the rhythm of advisory client work — every advisory client needs them computed, paid, and adjusted throughout the year. Today: the safe harbor rules, withholding interaction, the annualized income method for uneven-income clients, and how this all interacts with the §469 strategies we've covered. Plus week 4 synthesis tying everything together.",
        topicTags: ["quarterly_estimates", "str_loophole", "schedule_e_vs_c", "substantial_services", "rental_classification", "reps_aggregation_election", "mp_aggregation"],
        learningObjectives: [
          "Compute the §6654(d)(1)(B) safe harbor: 90% current year OR 100%/110% prior year",
          "Apply the withholding interaction under §6654(g)(1) for Q4 course-correction",
          "Identify when the §6654(d)(2) annualized income installment method is appropriate",
          "Distinguish 'substantial services' (Schedule C test) from 'hotel-like services' — different tests at different thresholds",
          "Explain the §469(c)(7)(A) aggregation election: when, how, and the binding effect",
          "Synthesize the entire §469 framework into an advisory-ready decision tree",
        ],
        tasks: [
          { id: "d20t1", text: "Read IRC §6654 — focus on (d)(1)(B) safe harbor rules and (d)(2) annualized income method" },
          { id: "d20t2", text: "Read Form 1040-ES Instructions" },
          { id: "d20t3", text: "Read Form 2210 Instructions including Schedule AI for annualized income" },
          { id: "d20t4", text: "Practice: Compute Q1 estimate for 5 sample client profiles (different AGI, different prior year facts)" },
          { id: "d20t5", text: "Read about state quarterly variations — specifically Florida (no income tax — N/A) and California (different schedule)" },
          { id: "d20t6", text: "Complete the Day 21 capstone: tie quarterly planning to STR strategy from Week 2 (Days 6-9)" },
          { id: "d20t7", text: "Schedule a 60-min red-team review with your Manager to kick off Weeks 5-8 (TODO_NICK)" },
        ],
        resources: [
          { label: "IRC §6654 (Estimated tax payments)", url: "https://www.law.cornell.edu/uscode/text/26/6654" },
          { label: "Form 1040-ES Instructions", url: "https://www.irs.gov/pub/irs-pdf/f1040es.pdf" },
          { label: "Form 2210 (Underpayment Penalty) Instructions", url: "https://www.irs.gov/pub/irs-pdf/i2210.pdf" },
          { label: "Form 2210 (blank)", url: "https://www.irs.gov/pub/irs-pdf/f2210.pdf" },
          { label: "IRS — Pay As You Go FAQ", url: "https://www.irs.gov/businesses/small-businesses-self-employed/pay-as-you-go-so-you-wont-owe-a-guide-to-withholding-estimated-taxes-and-ways-to-avoid-the-estimated-tax-penalty" },
          { label: "Aiola Quarterly Estimates Process", url: null /* TODO_NICK */ },
          { label: "Aiola Q4 Withholding Adjustment Template", url: null /* TODO_NICK */ },
        ],
        assessment: [
          {
            type: "CONFIDENCE_MCQ", id: "w4_mcq_substantial_vs_hotel",
            question: "A client has an Airbnb with avg guest stay of 5 nights. They provide WiFi, basic cleaning between guests, and a welcome basket. They materially participate. How is the activity treated?",
            options: [
              "Schedule C, with SE tax — because 'substantial services' makes it an active business",
              "Schedule E, nonpassive — because avg stay ≤ 7 days excludes from rental activity classification, MP makes loss nonpassive; substantial services for SCHEDULE PURPOSES (Reg. §1.1402(a)-4) requires a higher threshold (daily housekeeping, meals, concierge) that this client does NOT meet",
              "Schedule E, passive — short-term rentals are still rentals",
              "Form 4835 — farm rental income",
            ],
            correct: 1,
            topicTags: ["str_loophole", "schedule_e_vs_c", "substantial_services", "rental_classification"],
            difficulty: 5,
            explanation: "TWO DIFFERENT TESTS at TWO DIFFERENT THRESHOLDS — this is the most common conceptual error. (1) The §469 'rental activity' exclusion (Reg. §1.469-1T(e)(3)(ii)(A)) uses a 7-day average customer use threshold to determine passive classification. (2) The Schedule C / SE tax test (Reg. §1.1402(a)-4 + Pub 527) uses a 'substantial services' standard — services 'similar to those rendered by a hotel' (daily maid service, meals, concierge). Most STRs meet the 7-day test (so they escape passive treatment) but DO NOT meet the substantial services test (so they stay on Schedule E, no SE tax). WiFi + turnover cleaning + welcome basket is NOT substantial services. The activity is correctly: Schedule E + nonpassive (because of MP) + no SE tax. Memorize this distinction — many CPAs (and online articles) conflate these.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "w4_mcq_aggregation",
            question: "A real estate professional client wants to make the §469(c)(7)(A) aggregation election. Which statement is most accurate?",
            options: [
              "It's an annual election — file each year you want it to apply",
              "It's filed by attaching a statement to a timely-filed return; once made, it's binding for all future years until revoked with IRS consent (per Reg. §1.469-9(g)(3))",
              "It's automatic for any taxpayer who qualifies as REPS",
              "It can only be made in the first year of ownership",
            ],
            correct: 1,
            topicTags: ["reps_aggregation_election", "mp_aggregation"],
            difficulty: 4,
            explanation: "The aggregation election under §469(c)(7)(A) is made by attaching a statement to the timely-filed (including extensions) original return for the year of the election. It's NOT automatic. Once made, it's binding for that year and ALL FUTURE YEARS until revoked — and revocation requires IRS consent except in narrow cases (material change in facts, per Reg. §1.469-9(g)(3)). This is why Aiola's process is: don't recommend aggregation lightly. Run the math both ways before electing. For some clients, aggregating helps THIS year but hurts in a future year (e.g., a future property sold at a loss where you'd want it treated as a separate activity for §469(g) suspended-loss release). The decision is irreversible without IRS pain.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d20_mcq_safe_harbor_high_income",
            question: "Under §6654(d)(1)(B), an MFJ taxpayer with 2024 AGI of $300,000 wants to safe-harbor against 2025 underpayment penalty. They want to use prior-year-based safe harbor. Total payments throughout 2025 must be at least:",
            options: [
              "100% of 2024 tax liability",
              "110% of 2024 tax liability — the higher threshold applies because 2024 AGI exceeded $150,000 for MFJ",
              "90% of 2025 tax liability",
              "Either 100% of prior year OR 90% of current year — taxpayer chooses",
            ],
            correct: 1,
            topicTags: ["quarterly_estimates"],
            difficulty: 3,
            explanation: "§6654(d)(1)(B) safe harbor: pay LESSER of (i) 90% of current year tax OR (ii) 100% of prior year tax. BUT if prior year AGI > $150,000 (MFJ/single, $75k MFS), the prior-year requirement bumps to 110%. At $300k 2024 AGI, the high-income threshold is met — 110% of 2024 liability is the safe harbor floor. This affects most Aiola advisory clients (real estate income + W-2 spouse often pushes AGI past $150k). Critical Q1 conversation: 'last year we owed $X; you need to pay 110% of that across 2025 to avoid penalty, regardless of what 2025 actually looks like.'",
          },
          {
            type: "COMPUTATION", id: "d20_comp_q1_estimate",
            title: "Q1 Estimated Payment Calculation",
            topicTags: ["quarterly_estimates"],
            prompt: "Client 2024: AGI $250k, total federal tax $46k, total withholding $32k. For 2025, they want safe harbor on the prior year basis (since 2025 income is uncertain). Compute the TOTAL annual estimated payments needed across 2025 (assuming 2025 withholding stays the same at $32k).",
            expectedAnswer: 18600,
            tolerance: 50,
            unit: "dollars",
            formLine: "Form 1040-ES",
            workedSolution: [
              "Step 1: 2024 AGI = $250k > $150k → high-income; safe harbor = 110% of 2024 tax",
              "Step 2: Required 2025 total payments (safe harbor) = 110% × $46,000 = $50,600",
              "Step 3: Expected 2025 withholding = $32,000",
              "Step 4: Estimated payments needed = $50,600 − $32,000 = $18,600 across the four quarters",
              "Step 5: Per-quarter estimated payment = $18,600 / 4 = $4,650 paid by 4/15, 6/15, 9/15, and 1/15/2026 (subject to weekend/holiday adjustments)",
              "IMPORTANT: Withholding is treated as paid evenly throughout the year per §6654(g)(1) regardless of when actually withheld. So a client who under-withholds early in year and over-withholds late in year (W-2 spouse adjusts withholding in December) can effectively backfill earlier underpayment.",
              "PLANNING LEVER: Have W-2 spouse over-withhold late in year to fix Q1-Q3 underpayment for the rental side of the household.",
            ],
            commonWrongAnswers: [
              { value: 14000, indicates: "Used 100% of prior year (regular safe harbor) — but high-income threshold requires 110%." },
              { value: 50600, indicates: "Computed total safe harbor amount but didn't subtract expected withholding." },
              { value: 4650, indicates: "Computed per-quarter amount but the question asked for total annual." },
            ],
          },
          {
            type: "SCENARIO_BRANCHING", id: "d20_scenario_quarterly_planning",
            title: "Q3 Estimate Conversation with an STR Client",
            topicTags: ["quarterly_estimates", "str_loophole"],
            context: "Client (advisory, MFJ, $400k W-2 husband + $0 wife) closed on first STR in May 2024. Cost seg study yielded $200k year-1 depreciation. Wife will materially participate. They're asking about Q3 estimated payments due September 16. Their accountant from last year (you replaced) had set them up with $4,000/quarter estimated payments based on 2023 (no rental). Walk the conversation.",
            decisions: [
              {
                id: "dec1", prompt: "First analytical step?",
                options: [
                  { text: "Continue last year's $4k/quarter — it's safe harbor", weight: 1, correctness: "risky", nextId: null, terminalId: "t_blind_continuation" },
                  { text: "Project 2024 actual tax: $400k W-2 income MINUS ~$200k STR loss (assuming MP qualifies and STR exception applies) = ~$200k taxable. Actual 2024 tax ~$32k. They've already paid Q1+Q2 = $8k + $80k+ withholding running rate = significant overpayment. Reduce Q3 to $0 and consider adjusting withholding.", weight: 3, correctness: "great", nextId: "dec2", terminalId: null },
                  { text: "Recommend pausing Q3 entirely and waiting for year-end", weight: 2, correctness: "acceptable", nextId: null, terminalId: "t_partial" },
                  { text: "Just keep the same payment schedule — safer", weight: 1, correctness: "risky", nextId: null, terminalId: "t_blind_continuation" },
                ],
              },
              {
                id: "dec2", prompt: "Important check: how do you confirm MP and STR exception qualify before recommending the aggressive strategy?",
                options: [
                  { text: "Ask for: (1) avg stay computation YTD (must be ≤7 days), (2) wife's contemporaneous time logs YTD, (3) clear documentation that nobody else (cleaner, agent) has more hours than wife. Without these, the strategy fails on audit and the projection is wrong.", weight: 3, correctness: "great", nextId: "dec3", terminalId: null },
                  { text: "Just trust the client's word", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_blind_trust" },
                  { text: "Don't worry about it for the estimate calculation — it's just an estimate", weight: 1, correctness: "harmful", nextId: null, terminalId: "t_audit_blind" },
                ],
              },
              {
                id: "dec3", prompt: "Client confirms documentation. Final recommendation for Q3?",
                options: [
                  { text: "Skip Q3 entirely. Project ~$32k 2024 tax. They've likely already overpaid via withholding. Send them an updated 2024 projection showing expected refund. CRITICAL: also have them adjust 2024 W-4 with employer to lower withholding for the rest of 2024 (or at least Q4) since they're getting a giant refund.", weight: 3, correctness: "great", nextId: null, terminalId: "t_great" },
                  { text: "Pay Q3 anyway as a buffer", weight: 1, correctness: "risky", nextId: null, terminalId: "t_overpayment" },
                ],
              },
            ],
            terminals: [
              { id: "t_great", label: "Pro Quarterly Planning", outcome: "great", coachingNote: "This is the kind of mid-year intervention that defines Aiola's value. The previous CPA mechanically continued $4k/quarter without re-projecting after the STR purchase — leaving $20k+ of cash sitting at the IRS earning 0%. Three teaching points: (1) Quarterly estimates must be RE-PROJECTED any time material facts change (new property, big sale, entity change). (2) Always check withholding interaction — withholding is the cleanest lever for course-correction. (3) Don't 'over-buffer' on estimates; an overpayment is just an interest-free loan to the IRS." },
              { id: "t_blind_continuation", label: "Blind Continuation", outcome: "risky", coachingNote: "Continuing last year's estimate when the client's tax situation has materially changed is exactly the kind of mechanical accountant work Aiola is supposed to replace. The whole point of advisory is proactive re-projection — that's the value." },
              { id: "t_partial", label: "Partial Credit", outcome: "acceptable", coachingNote: "Pausing is OK in concept but doesn't solve the actual question — what about Q1+Q2 already paid? You should also be advising on a 2024 W-4 adjustment to reduce withholding for the rest of the year. Don't stop at the immediate question; think about the full picture." },
              { id: "t_blind_trust", label: "Blind Trust", outcome: "harmful", coachingNote: "The penalty for trusting a client's verbal claim of MP without documentation is: 18 months later, IRS notice, no documentation = strategy unwinds = $50k+ in additional tax + penalties. Trust but verify is the standard." },
              { id: "t_audit_blind", label: "Audit Blind", outcome: "harmful", coachingNote: "STR strategy is a high-audit-risk claim. Estimating tax based on facts that won't survive an audit is mismanagement of client expectations. Always project tax based on the FACTS THAT WILL SURVIVE AUDIT." },
              { id: "t_overpayment", label: "Unnecessary Overpayment", outcome: "risky", coachingNote: "An overpayment to the IRS is just an interest-free loan. With confirmed documentation supporting the strategy, there's no reason to pay Q3. The client is better off having that $4k in their checking account." },
            ],
          },
          {
            type: "CONFIDENCE_MCQ", id: "d20_mcq_withholding_timing",
            question: "Per §6654(g)(1), how is W-2 withholding treated for purposes of computing quarterly underpayment penalty?",
            options: [
              "Allocated by the actual date of each paycheck",
              "Treated as paid evenly throughout the year regardless of when actually withheld (default rule), unless taxpayer ELECTS to use actual dates",
              "Allocated entirely to Q1",
              "Allocated entirely to Q4",
            ],
            correct: 1,
            topicTags: ["quarterly_estimates"],
            difficulty: 4,
            explanation: "§6654(g)(1) treats withholding as paid evenly throughout the year — unless the taxpayer elects to use actual withholding dates (rarely advantageous). This is a HUGE planning lever for advisory clients. Example: client under-withheld through Q3, has a big rental loss to apply, expects under-payment penalty exposure on Q1-Q3. Solution: have W-2 spouse increase Q4 withholding via amended W-4 — that increase is treated as paid evenly throughout the year, retroactively curing earlier underpayment. This is one of the most useful Q4 planning techniques.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d20_mcq_annualized_income",
            question: "When is the §6654(d)(2) annualized income installment method (Schedule AI) most useful?",
            options: [
              "For all advisory clients, every year",
              "When client income is highly UNEVEN — e.g., a large Q4 capital gain, seasonal STR income concentrated in summer, or a one-time bonus. Schedule AI annualizes income period-by-period so the safe-harbor calc reflects when income was actually earned.",
              "For clients with steady W-2 income only",
              "Only for clients in their first year of operation",
            ],
            correct: 1,
            topicTags: ["quarterly_estimates"],
            difficulty: 4,
            explanation: "Schedule AI of Form 2210 implements the §6654(d)(2) annualized income installment method. It's an alternative to the standard quarterly safe harbor that recomputes the safe harbor based on income actually earned through each quarter. Most useful when income is uneven: a client with $50k Q1 income but $200k Q4 income (e.g., year-end stock sale or bonus) might fail standard safe harbor on Q1 but pass under annualized method since they hadn't earned the big Q4 income yet at Q1. Aiola's STR clients with seasonal income (summer-heavy) often benefit. The downside: requires more tracking and recomputation throughout the year.",
          },
          {
            type: "CONFIDENCE_MCQ", id: "d20_mcq_due_dates",
            question: "What are the federal quarterly estimated tax due dates in a typical year?",
            options: [
              "March 31, June 30, September 30, December 31",
              "April 15, June 15, September 15, January 15 of the following year (subject to weekend/holiday adjustments)",
              "January 15, April 15, July 15, October 15",
              "Only April 15 with a year-end true-up",
            ],
            correct: 1,
            topicTags: ["quarterly_estimates"],
            difficulty: 1,
            explanation: "Federal quarterly estimated tax due dates: 4/15 (Q1), 6/15 (Q2), 9/15 (Q3), 1/15 of following year (Q4). When the date falls on weekend or holiday, it shifts to the next business day. Example 2024: 4/15, 6/17 (June 15 was Saturday), 9/16 (Sept 15 was Sunday), 1/15/2025. State quarterlies often follow same dates but each state varies. Always confirm state due dates separately — California, for example, uses 4/15, 6/15, 9/15, 1/15 but front-loads with 30%/40%/0%/30% (not even quarters) — a common trap for clients moving from another state.",
          },
        ],
      },
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
        resources: [{ label: "ISM Meeting Framework", url: null }, { label: "Mock ISM Tool (Link)", url: null }, { label: "Scoring Rubric", url: null }],
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
        resources: [{ label: "Sample TSR #1", url: null }, { label: "Sample TSR #2", url: null }, { label: "TSR Template", url: null }],
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
          { id: "w7t5", text: "Review the client escalation matrix: when to involve your Manager" },
        ],
        resources: [{ label: "Checkup Meeting Template", url: null }, { label: "Time Log Template", url: null }, { label: "Email Outreach Templates", url: null }],
        quiz: { question: "How often should advisory clients ideally have a checkup call?", options: ["Only at year-end", "Quarterly, with flexibility based on complexity", "Monthly without exception", "Only when the client requests one"], correct: 1 },
      },
      {
        id: "w8", title: "Week 8 — Days 31–60 Checkpoint",
        description: "Formal mid-point review and self-assessment.",
        tasks: [
          { id: "w8t1", text: "Complete the 60-Day self-assessment questionnaire" },
          { id: "w8t2", text: "Prepare a summary of key learnings and areas for growth" },
          { id: "w8t3", text: "Schedule and complete your 60-Day review with your Manager" },
          { id: "w8t4", text: "Set goals for Days 61–90 based on review feedback" },
          { id: "w8t5", text: "Begin shadowing live advisory meetings (observe + take notes)" },
        ],
        resources: [{ label: "60-Day Self-Assessment", url: null }, { label: "Performance Review Template", url: null }],
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
        resources: [{ label: "Live Meeting Prep Checklist", url: null }, { label: "TSR Quality Checklist", url: null }],
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
        resources: [{ label: "KPI Tracking Dashboard", url: null }, { label: "Client Satisfaction Survey", url: null }],
        quiz: { question: "When managing your own client portfolio, how should you prioritize your weekly tasks?", options: ["Respond to emails first, then schedule meetings", "Upcoming deadlines first, then proactive outreach, then administrative tasks", "Work on whatever feels most urgent in the moment", "Focus exclusively on new client acquisition"], correct: 1 },
      },
      {
        id: "w11_12", title: "Weeks 11–12 — 90-Day Graduation",
        description: "Final review, goal-setting, and transition to full autonomy.",
        tasks: [
          { id: "w12t1", text: "Complete the 90-Day comprehensive self-assessment" },
          { id: "w12t2", text: "Prepare your 90-Day portfolio: all TSRs, meeting recordings, client feedback" },
          { id: "w12t3", text: "Present your 90-Day review to your Manager and the advisory team" },
          { id: "w12t4", text: "Set 6-month performance goals collaboratively" },
          { id: "w12t5", text: "Transition to fully independent advisory role" },
          { id: "w12t6", text: "Complete the final certification quiz" },
        ],
        resources: [{ label: "90-Day Self-Assessment", url: null }, { label: "6-Month Goal Template", url: null }, { label: "Advisory Certification Checklist", url: null }],
        quiz: { question: "At the end of 90 days, a fully onboarded advisor should be able to:", options: ["Handle only tax prep returns independently", "Lead ISMs, build and deliver TSRs, manage client relationships, and track KPIs — all independently", "Shadow senior advisors on all meetings", "Focus exclusively on sales calls"], correct: 1 },
      },
    ],
  },
];

// ─── Demo Users ──────────────────────────────────────────────────────────────

const MOCK_TRAINEES = [
  { id: "chris_m", name: "Chris Martinez", email: "chris@aiolacpa.com", role: "trainee", startDate: "2026-04-21", track: "Advisory", avatar: "CM" },
  { id: "mary_c", name: "Mary Chen", email: "mary@aiolacpa.com", role: "trainee", startDate: "2026-02-23", track: "Advisory", avatar: "MC" },
  { id: "jesse_s", name: "Jesse Snyder", email: "jesse.snyder@aiolacpa.com", role: "trainee", startDate: "2026-05-04", track: "Advisory", avatar: "JS" },
];
const MOCK_ADMINS = [
  { id: "nick_a", name: "Nick Aiola", email: "nick@aiolacpa.com", role: "admin", avatar: "NA" },
];
const MOCK_CLIENTS = [
  { id: "alex_r", name: "Alex Rivera", email: "alex.rivera@email.com", role: "client", avatar: "AR" },
];

const CREDENTIALS = {
  // Trainees — password is their email until real auth ships
  "chris@aiolacpa.com": "chris@aiolacpa.com",
  "mary@aiolacpa.com": "mary@aiolacpa.com",
  "jesse.snyder@aiolacpa.com": "jesse.snyder@aiolacpa.com",
  // Admins
  "nick@aiolacpa.com": "AiolaAdmin2026",
  // Client demo
  "alex.rivera@email.com": "alex.rivera@email.com",
};

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
      { week: 1, score: 3.8, manager: "Nick Aiola", date: "2026-04-28", phase: "day30", comment: "Good start, responsive on Slack" },
      { week: 2, score: 4.0, manager: "Nick Aiola", date: "2026-05-05", phase: "day30", comment: "Improving clarity in emails" },
    ],
    teamwork: [
      { week: 1, score: 3.9, manager: "Nick Aiola", date: "2026-04-28", phase: "day30", comment: "Collaborative in team meetings" },
      { week: 2, score: 4.1, manager: "Nick Aiola", date: "2026-05-05", phase: "day30", comment: "Volunteered to help onboard new tool" },
    ],
  },
  mary_c: {
    communication: [
      { week: 1, score: 4.2, manager: "Nick Aiola", date: "2026-03-02", phase: "day30", comment: "Strong communicator from day one" },
      { week: 2, score: 4.3, manager: "Nick Aiola", date: "2026-03-09", phase: "day30", comment: "Clear and concise updates" },
      { week: 3, score: 4.1, manager: "Nick Aiola", date: "2026-03-16", phase: "day60", comment: "Slight dip but still solid" },
    ],
    teamwork: [
      { week: 1, score: 4.0, manager: "Nick Aiola", date: "2026-03-02", phase: "day30", comment: "Works well with advisory team" },
      { week: 2, score: 4.2, manager: "Nick Aiola", date: "2026-03-09", phase: "day30", comment: "Helped peers with client prep" },
      { week: 3, score: 4.4, manager: "Nick Aiola", date: "2026-03-16", phase: "day60", comment: "Strong cross-team collaboration" },
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
const inferScorecardPhase = (daysSinceStart) => daysSinceStart <= 30 ? "day30" : daysSinceStart <= 60 ? "day60" : "day90";
const computeScorecard = (scores) => {
  const total = Object.values(scores).reduce((sum, s) => sum + (s?.score || 0), 0);
  let band;
  if (total >= 17) band = "Mastery";
  else if (total >= 14) band = "Proficient";
  else if (total >= 11) band = "Developing";
  else band = "Below Bar";
  const ones = Object.values(scores).filter(s => s?.score === 1).length;
  if (ones >= 2) band = "Below Bar";
  else if (ones === 1 && band !== "Below Bar") band = "Developing";
  return { total, band };
};
const pMeta = [{ids:["week1","week2","week3","week4"],label:"Days 1–30",color:B.blue},{ids:["week5_8"],label:"Days 31–60",color:B.purple},{ids:["week9_12"],label:"Days 61–90",color:B.ok}];

// ═════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showAdminPicker, setShowAdminPicker] = useState(false);
  const [error, setError] = useState("");

  const allAccounts = [...MOCK_ADMINS, ...MOCK_TRAINEES, ...MOCK_CLIENTS];

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail || !password) { setError("Email or password is incorrect."); return; }
    const expectedPw = CREDENTIALS[trimmedEmail];
    if (expectedPw === undefined || password !== expectedPw) { setError("Email or password is incorrect."); return; }
    const found = allAccounts.find(u => u.email.toLowerCase() === trimmedEmail);
    if (found) { setError(""); onLogin(found); }
    else { setError("Email or password is incorrect."); }
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
          {!showAdminPicker ? (
            <>
              <h2 style={{margin:"0 0 6px",fontSize:22,fontWeight:700,color:B.navy,textAlign:"center"}}>Aiola Training Portal</h2>
              <p style={{margin:"0 0 28px",fontSize:13,color:B.t3,textAlign:"center"}}>Sign in to your account</p>
              <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:14}}>
                <div>
                  <label style={{display:"block",fontSize:12,fontWeight:600,color:B.t2,marginBottom:6}}>Email</label>
                  <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError("");}} placeholder="you@aiolacpa.com" aria-label="Email address" style={inputStyle}
                    onFocus={e=>{e.target.style.borderColor=B.blue}} onBlur={e=>{e.target.style.borderColor=B.bdr}}/>
                </div>
                <div>
                  <label style={{display:"block",fontSize:12,fontWeight:600,color:B.t2,marginBottom:6}}>Password</label>
                  <input type="password" value={password} onChange={e=>{setPassword(e.target.value);setError("");}} placeholder="••••••••" aria-label="Password" style={inputStyle}
                    onFocus={e=>{e.target.style.borderColor=B.blue}} onBlur={e=>{e.target.style.borderColor=B.bdr}}/>
                </div>
                {error && <div style={{fontSize:12,color:B.err,textAlign:"center"}}>{error}</div>}
                <button type="submit" style={{width:"100%",padding:"14px 20px",border:"none",borderRadius:10,background:B.blue,cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600,color:"#fff",transition:"all .2s",boxShadow:"0 2px 8px rgba(59,141,208,.3)"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=B.blueD}} onMouseLeave={e=>{e.currentTarget.style.background=B.blue}}>
                  Sign In
                </button>
              </form>
              <div style={{textAlign:"center",marginTop:20}}>
                <span onClick={()=>setShowAdminPicker(true)} style={{fontSize:11,color:B.t3,cursor:"pointer",textDecoration:"none",transition:"color .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.color=B.blue}} onMouseLeave={e=>{e.currentTarget.style.color=B.t3}}>
                  Need administrator access? <span style={{textDecoration:"underline"}}>Admin login</span>
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                <h2 style={{margin:0,fontSize:18,fontWeight:700,color:B.navy}}>Admin Access</h2>
                <span onClick={()=>setShowAdminPicker(false)} style={{fontSize:12,color:B.blue,cursor:"pointer",fontWeight:500}}
                  onMouseEnter={e=>{e.currentTarget.style.textDecoration="underline"}} onMouseLeave={e=>{e.currentTarget.style.textDecoration="none"}}>
                  ← Back to standard login
                </span>
              </div>
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
            </>
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
  // Custom columns
  const [customCols, setCustomCols] = useState(() => { try { const s = localStorage.getItem("aiola_client_custom_cols"); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [customData, setCustomData] = useState(() => { try { const s = localStorage.getItem("aiola_client_custom_data"); return s ? JSON.parse(s) : {}; } catch { return {}; } });
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("Text");
  useEffect(() => { localStorage.setItem("aiola_client_custom_cols", JSON.stringify(customCols)); }, [customCols]);
  useEffect(() => { localStorage.setItem("aiola_client_custom_data", JSON.stringify(customData)); }, [customData]);
  const addCustomCol = () => { if (!newColName.trim()) return; setCustomCols(p => [...p, { id: "cc_" + Date.now(), name: newColName.trim(), type: newColType }]); setNewColName(""); setNewColType("Text"); setShowAddCol(false); };
  const updateCustomCell = (clientId, colId, val) => { setCustomData(p => ({...p, [clientId]: {...(p[clientId]||{}), [colId]: val}})); };

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
    const ccHeaders = customCols.map(c => c.name).join(",");
    const header = "Client ID,Name,Tier,Email,% Complete,Status,Onboard Date" + (ccHeaders ? "," + ccHeaders : "");
    const rows = filtered.map(c => {
      const pct = Math.round(c.completedTodos / c.totalTodos * 100);
      const ccVals = customCols.map(col => `"${(customData[c.id]?.[col.id]||"").replace(/"/g,'""')}"`).join(",");
      return `${c.id},"${c.name}",${c.tier},${c.email},${pct}%,${getStatus(c)},${c.onboardDate || ""}` + (ccVals ? "," + ccVals : "");
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
        <div className="r-table-grid" style={{display:"grid",gridTemplateColumns:`80px 2fr 0.8fr 1.5fr 0.8fr 0.8fr${customCols.map(()=>" 1fr").join("")} 140px 32px`,padding:"12px 24px",borderBottom:`1px solid ${B.bdr}`,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:B.t3,alignItems:"center"}}>
          {sortableHeader("Client ID","id")}{sortableHeader("Client Name","name")}{sortableHeader("Tier","tier")}<span>Email</span>{sortableHeader("% Complete","pct")}<span>Status</span>{customCols.map(cc=><span key={cc.id}>{cc.name}</span>)}<span></span>
          <button onClick={()=>setShowAddCol(true)} title="Add custom column" style={{width:24,height:24,border:`1px solid ${B.bdr}`,borderRadius:6,background:"#fff",color:B.t3,fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1}}>+</button>
        </div>
        {showAddCol && (
          <div style={{padding:"14px 24px",borderBottom:`1px solid ${B.bdr}`,background:"#f8fafc",display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
            <div><label style={{fontSize:10,fontWeight:600,color:B.t3,display:"block",marginBottom:3}}>Column Name</label><input value={newColName} onChange={e=>setNewColName(e.target.value)} placeholder="e.g. Account Manager" style={{padding:"7px 10px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:12,fontFamily:"inherit",width:160,outline:"none"}} onKeyDown={e=>{if(e.key==="Enter")addCustomCol()}}/></div>
            <div><label style={{fontSize:10,fontWeight:600,color:B.t3,display:"block",marginBottom:3}}>Type</label><select value={newColType} onChange={e=>setNewColType(e.target.value)} style={{padding:"7px 10px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:12,fontFamily:"inherit",background:"#fff"}}><option>Text</option><option>Number</option><option>Date</option></select></div>
            <button onClick={addCustomCol} disabled={!newColName.trim()} style={{padding:"7px 16px",border:"none",borderRadius:6,background:newColName.trim()?B.blue:B.bdr,color:"#fff",fontSize:11,fontWeight:600,cursor:newColName.trim()?"pointer":"default",fontFamily:"inherit"}}>Add Column</button>
            <button onClick={()=>{setShowAddCol(false);setNewColName("");setNewColType("Text")}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:B.t3,fontFamily:"inherit",textDecoration:"underline"}}>Cancel</button>
          </div>
        )}
        {filtered.length===0&&<div style={{padding:"32px 24px",textAlign:"center",fontSize:13,color:B.t3}}>No clients match your search.</div>}
        {filtered.map(c=>{
          const pct=Math.round(c.completedTodos/c.totalTodos*100);
          const pctColor=pct>=80?B.ok:pct>=50?B.blue:pct>=30?B.warn:B.err;
          const status=getStatus(c);
          return(
            <div key={c.id} className="r-table-grid" style={{display:"grid",gridTemplateColumns:`80px 2fr 0.8fr 1.5fr 0.8fr 0.8fr${customCols.map(()=>" 1fr").join("")} 140px 32px`,padding:"14px 24px",borderBottom:`1px solid ${B.bdr}`,alignItems:"center",transition:"background .1s"}}
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
              {customCols.map(cc => {
                const val = customData[c.id]?.[cc.id] || "";
                return <input key={cc.id} value={val} onChange={e=>updateCustomCell(c.id,cc.id,e.target.value)} type={cc.type==="Number"?"number":cc.type==="Date"?"date":"text"} style={{padding:"5px 8px",border:`1px solid ${B.bdr}`,borderRadius:5,fontSize:11,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box",background:"transparent"}} onFocus={e=>{e.target.style.borderColor=B.blue;e.target.style.background="#fff"}} onBlur={e=>{e.target.style.borderColor=B.bdr;e.target.style.background="transparent"}}/>;
              })}
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setViewingClient(c)} style={{padding:"5px 10px",border:`1px solid ${B.blue}`,borderRadius:6,background:"#fff",color:B.blue,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>View</button>
                <button onClick={()=>setConfirmOffboard(c)} style={{padding:"5px 10px",border:`1px solid ${B.err}`,borderRadius:6,background:"#fff",color:B.err,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Off-board</button>
              </div>
              <span/>
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

// Get overdue quizzes/assessments for a trainee
// TODO(future): also iterate item.assessment[] for items using the post-Sprint-1 assessment
// shape. Current logic only catches legacy item.quiz items. As more weeks rebuild to the
// assessment format, this card progressively under-counts.
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

function generateMilestoneReport(trainee, traineeData, kpiData, notesData, scorecards, { dateFrom, dateTo, isTraineeReport } = {}) {
  try {
  // Date range filtering
  const rangeFrom = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
  const rangeTo = dateTo ? new Date(dateTo + "T23:59:59") : null;
  const inRange = (dateVal) => {
    if (!dateVal) return true;
    const d = new Date(dateVal);
    if (rangeFrom && d < rangeFrom) return false;
    if (rangeTo && d > rangeTo) return false;
    return true;
  };
  const rangeLbl = (rangeFrom && rangeTo) ? `${rangeFrom.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} - ${rangeTo.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}` : "";

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
  const diff = prog.pct - timelinePct;
  const statusLabel = diff >= 0 ? "On Track" : diff >= -10 ? "Slightly Behind" : "Behind Schedule";

  let assessment;
  if (diff >= 0) {
    assessment = `${trainee.name} is performing well and is on track to meet their ${milestoneLabel} targets. Task completion is at ${prog.pct}% with ${prog.passedQuizzes} of ${totalQuizzes} quizzes passed. Continue monitoring progress and providing feedback.`;
  } else if (diff >= -10) {
    assessment = `${trainee.name} is slightly behind schedule with ${prog.pct}% task completion against ${timelinePct}% expected timeline progress. Review the areas below for specific gaps and consider additional support or check-ins.`;
  } else {
    assessment = `${trainee.name} is significantly behind their expected progress (${prog.pct}% complete vs ${timelinePct}% expected). Immediate attention is recommended. Schedule a 1-on-1 to identify blockers and create an action plan.`;
  }

  // Helper: escape HTML
  const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

  // Helper: build an HTML table
  const htmlTable = (headers, rows) => {
    let h = '<table><thead><tr>' + headers.map(c => `<th>${esc(c)}</th>`).join("") + '</tr></thead><tbody>';
    rows.forEach((row, i) => {
      h += `<tr class="${i%2===1?'alt':''}">` + row.map(c => `<td>${esc(c)}</td>`).join("") + '</tr>';
    });
    return h + '</tbody></table>';
  };

  // Helper: key-value rows
  const kvTable = (rows) => {
    let h = '<table class="kv">';
    rows.forEach((r, i) => {
      h += `<tr class="${i%2===1?'alt':''}"><td class="kv-label">${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`;
    });
    return h + '</table>';
  };

  // ── Build KPI section ──
  let kpiHtml = '';
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

    kpiHtml += `<h3>${esc(kpiDef.category)}</h3>`;
    kpiHtml += `<p class="desc">${esc(kpiDef.description)}</p>`;
    kpiHtml += kvTable([
      ["Target (Current Phase)", target.toFixed(1)],
      ["Current Average", entries.length > 0 ? avg.toFixed(2) : "N/A"],
      ["Status", kpiStatus],
      ["Trend", trend],
      ["Frequency", kpiDef.frequency],
    ]);

    if (entries.length > 0) {
      kpiHtml += htmlTable(
        ["Week", "Score", "Submitted By", "Comment"],
        entries.map(e => [e.week, e.score.toFixed(1), e.manager, e.comment || ""])
      );
    } else {
      kpiHtml += '<p class="empty">No scores recorded yet.</p>';
    }
  });
  kpiHtml += '<p class="footnote">KPI data is based on weekly manager submissions and team pulse surveys.</p>';

  // ── Build training progress section ──
  let progressHtml = '';
  pMeta.forEach((pm) => {
    const phaseSections = PHASES.filter(p => pm.ids.includes(p.id));
    if (phaseSections.length === 0) return;
    progressHtml += `<h3>${esc(pm.label)}</h3>`;
    const rows = [];
    phaseSections.forEach(phase => {
      phase.items.forEach(item => {
        const tasksDone = item.tasks.filter(t => tasks[t.id]).length;
        const tasksTotal = item.tasks.length;
        const quizStatus = item.quiz ? (isQuizPassed(quizzes, item.id) ? "Passed" : "Not Passed") : "N/A";
        const highlight = tasksDone === 0 && days > (pm === pMeta[0] ? 0 : pm === pMeta[1] ? 30 : 60);
        rows.push([item.title, `${tasksDone}/${tasksTotal}`, quizStatus, highlight ? "No progress" : ""]);
      });
    });
    progressHtml += htmlTable(["Section", "Tasks", "Quiz", "Notes"], rows);
  });

  // ── Build scorecards section ──
  const allScorecards = (scorecards || []).filter(sc => inRange(sc.date)).sort((a,b) => new Date(a.date) - new Date(b.date));
  let scorecardHtml = '';
  if (allScorecards.length > 0) {
    const phaseGroups = { day30: [], day60: [], day90: [] };
    allScorecards.forEach(sc => { (phaseGroups[sc.phase] || phaseGroups.day30).push(sc); });
    const phaseLbls = { day30: "Days 1–30", day60: "Days 31–60", day90: "Days 61–90" };
    for (const [phaseKey, entries] of Object.entries(phaseGroups)) {
      if (entries.length === 0) continue;
      scorecardHtml += `<h3>${esc(phaseLbls[phaseKey] || phaseKey)}</h3>`;
      entries.forEach(sc => {
        let delivTitle = sc.deliverableId;
        for (const phase of PHASES) { for (const item of phase.items) { if (item.id === sc.weekItemId && item.deliverables) { const d = item.deliverables.find(dl => dl.id === sc.deliverableId); if (d) delivTitle = d.title; } } }
        const bandStyle = sc.band === "Mastery" ? "color:#22c55e" : sc.band === "Proficient" ? "color:#3B8DD0" : sc.band === "Developing" ? "color:#f59e0b" : "color:#DC2626";
        scorecardHtml += `<div style="margin-bottom:12px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;">`;
        scorecardHtml += `<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><strong>${esc(delivTitle)}</strong><span style="${bandStyle};font-weight:bold">${esc(sc.band)} (${sc.total}/20)</span></div>`;
        scorecardHtml += `<div style="font-size:9pt;color:#5a6577;margin-bottom:6px">${esc(new Date(sc.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}))} · ${esc(sc.submittedBy)}</div>`;
        const rubricCats = [];
        for (const phase of PHASES) { for (const item of phase.items) { if (item.id === sc.weekItemId && item.weeklyRubric) { item.weeklyRubric.categories.forEach(c => rubricCats.push(c)); } } }
        if (rubricCats.length > 0) {
          scorecardHtml += htmlTable(["Category", "Score", "Notes"], rubricCats.map(cat => {
            const cs = sc.scores?.[cat.num];
            return [cat.name, cs ? `${cs.score}/4` : "—", cs?.notes || ""];
          }));
        }
        if (sc.overallNotes) scorecardHtml += `<p class="desc" style="margin-top:4px"><em>Overall:</em> ${esc(sc.overallNotes)}</p>`;
        scorecardHtml += `</div>`;
      });
    }
  } else {
    scorecardHtml = '<p class="empty">No presentation scorecards in this period.</p>';
  }

  // ── Build notes & badges section ──
  let notesHtml = `<h3>Badges &amp; Recognitions</h3>`;
  const phasePill = (p) => p === "day30" ? "Days 1–30" : p === "day60" ? "Days 31–60" : p === "day90" ? "Days 61–90" : "";
  if (badges.length > 0) {
    notesHtml += htmlTable(["Badge", "Awarded By", "Date", "Phase"],
      badges.map(b => [b.label, b.awardedBy, b.date ? new Date(b.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "", phasePill(b.phase)]));
  } else {
    notesHtml += '<p class="empty">No badges awarded yet.</p>';
  }

  notesHtml += `<h3>${isTraineeReport ? "Feedback" : "Manager Notes"}</h3>`;
  if (notes.length > 0) {
    const sortedNotes = [...notes].sort((a, b) => new Date(a.date) - new Date(b.date));
    const noteHeaders = isTraineeReport ? ["Date", "Author", "Feedback", "Type", "Phase"] : ["Date", "Author", "Note", "Visibility", "Phase"];
    notesHtml += htmlTable(noteHeaders, sortedNotes.map(n => [
      n.date ? new Date(n.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "",
      n.author, n.text,
      isTraineeReport ? (n.tag === "positive" ? "Positive" : n.tag === "improve" ? "Improve" : "General") : (n.visibility === "shared" ? "Shared" : "Internal"),
      phasePill(n.phase),
    ]));
  } else {
    notesHtml += `<p class="empty">${isTraineeReport ? "No feedback shared yet." : "No manager notes recorded yet."}</p>`;
  }

  if (!isTraineeReport) {
    notesHtml += '<h3>Areas of Focus</h3>';
    const focusAreas = [];
    PHASES.forEach(phase => { phase.items.forEach(item => { if (item.quiz && !isQuizPassed(quizzes, item.id)) focusAreas.push(`Quiz not passed: ${item.title}`); }); });
    ONBOARDING_KPIS.forEach(kpiDef => {
      const entries = (kpi[kpiDef.id] || []).filter(e => inRange(e.date));
      if (entries.length > 0) {
        const avg = entries.reduce((a, e) => a + e.score, 0) / entries.length;
        const currentPhaseKey = days <= 30 ? "day30" : days <= 60 ? "day60" : "day90";
        const target = kpiDef.targets[currentPhaseKey];
        if (avg < target) focusAreas.push(`${kpiDef.category}: Average ${avg.toFixed(2)} below target ${target.toFixed(1)}`);
      }
    });
    if (prog.pct < timelinePct - 10) focusAreas.push(`Overall progress (${prog.pct}%) significantly behind timeline (${timelinePct}%)`);
    if (focusAreas.length > 0) {
      notesHtml += '<ul>' + focusAreas.map(a => `<li>${esc(a)}</li>`).join("") + '</ul>';
    } else {
      notesHtml += '<p class="empty">No specific areas of concern identified. Continue current trajectory.</p>';
    }
  }

  // ── Build AI chat section ──
  let chatHtml = '<p class="desc">Questions asked reflect areas where the trainee sought additional guidance during onboarding.</p>';
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
    chatHtml += htmlTable(["Date", "Conversation Title", "Messages"], chatRows);
  } else {
    chatHtml += htmlTable(["Date", "Conversation Title", "Messages"], [["--", "No AI assistant activity recorded during this period.", "--"]]);
  }

  // ── Assemble full HTML document ──
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(trainee.name)} - ${esc(reportTitle)}</title>
<style>
  @page { size: letter; margin: 0.75in 1in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; color: #1a1a2e; line-height: 1.5; }
  .page { page-break-after: always; min-height: 100vh; }
  .page:last-child { page-break-after: avoid; }
  /* Cover page */
  .cover { background: #1a1a2e; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2in 1in; min-height: 100vh; }
  .cover .logo-text { font-family: Arial, Helvetica, sans-serif; font-size: 14pt; font-weight: bold; color: #3B8DD0; letter-spacing: 2px; margin-bottom: 40px; }
  .cover .trainee-name { font-size: 28pt; font-weight: bold; margin-bottom: 10px; }
  .cover .report-title { font-size: 18pt; color: #3B8DD0; margin-bottom: 30px; }
  .cover .cover-sub { font-size: 11pt; color: #a8d0f0; margin-bottom: 6px; }
  .cover .confidential { position: absolute; bottom: 40px; font-size: 9pt; color: #646e82; }
  /* Section pages */
  .section { padding: 20px 0; }
  .section-title { font-size: 16pt; font-weight: bold; color: #1a1a2e; border-bottom: 2px solid #3B8DD0; padding-bottom: 6px; margin-bottom: 16px; }
  h3 { font-size: 12pt; color: #1a1a2e; margin: 16px 0 8px; }
  p.desc { font-size: 10pt; color: #5a6577; margin-bottom: 8px; }
  p.empty { font-size: 10pt; color: #5a6577; font-style: italic; margin: 6px 0 12px 8px; }
  p.footnote { font-size: 8pt; color: #5a6577; font-style: italic; margin-top: 10px; }
  p.assessment { font-size: 10pt; color: #5a6577; line-height: 1.6; margin: 6px 0 0; }
  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9pt; }
  th { background: #1e3a5f; color: #fff; font-weight: bold; text-align: left; padding: 6px 8px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; color: #1a1a2e; }
  tr.alt td { background: #f8f9fa; }
  table.kv { margin-bottom: 10px; }
  table.kv td.kv-label { font-weight: bold; width: 200px; }
  table.kv td { font-size: 10pt; }
  ul { margin: 6px 0 12px 24px; font-size: 10pt; color: #5a6577; }
  li { margin-bottom: 4px; }
  /* Footer */
  .footer { font-size: 8pt; color: #5a6577; display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e5e7eb; margin-top: auto; }
  @media print {
    .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr.alt td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  @media screen {
    body { max-width: 8.5in; margin: 0 auto; padding: 0.5in; background: #f5f5f5; }
    .page { background: #fff; padding: 0.75in 1in; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,.1); border-radius: 4px; min-height: auto; }
    .cover { border-radius: 4px; min-height: 600px; position: relative; }
    .print-bar { position: sticky; top: 0; background: #1a1a2e; color: #fff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; font-family: Arial, sans-serif; font-size: 13px; z-index: 10; margin: -0.5in -0.5in 20px; width: calc(100% + 1in); border-radius: 0; }
    .print-bar button { background: #3B8DD0; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: Arial, sans-serif; }
    .print-bar button:hover { background: #2a7bc0; }
  }
</style>
</head>
<body>
<div class="print-bar no-print">
  <span>Aiola CPA, PLLC &mdash; ${esc(reportTitle)}</span>
  <button onclick="window.print()">Print / Save as PDF</button>
</div>

<!-- PAGE 1: Cover -->
<div class="page cover">
  <div class="logo-text">AIOLA CPA, PLLC</div>
  <div class="trainee-name">${esc(trainee.name)}</div>
  <div class="report-title">${esc(reportTitle)}</div>
  <div class="cover-sub">${isTraineeReport ? "Aiola CPA, PLLC" : "Prepared by Aiola CPA, PLLC"}</div>
  <div class="cover-sub">${esc(dateStr)}</div>
  ${rangeLbl ? `<div class="cover-sub" style="margin-top:8px;font-size:10pt">Report Period: ${esc(rangeLbl)}</div>` : ""}
  <div class="confidential">This document is confidential and intended for internal use only.</div>
</div>

<!-- PAGE 2: Executive Summary -->
<div class="page section">
  <div class="section-title">Executive Summary</div>
  ${kvTable([
    ["Start Date", new Date(trainee.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
    ["Days in Program", `${days} days`],
    ["Current Phase", phaseLbl],
    ["Track", trainee.track || "Advisory"],
    ["Task Completion", `${prog.doneTasks}/${totalTasks} tasks (${prog.pct}%)`],
    ["Quizzes Passed", `${prog.passedQuizzes}/${totalQuizzes}`],
    ["Timeline Progress", `${timelinePct}%`],
    ["Timeline Status", statusLabel],
    ["Milestones", milestones.map(m => `${m.label}: ${m.unlocked ? "OK" : `${m.done}/${m.total}`}`).join("  |  ")],
    ...(rangeLbl ? [["Report Period", rangeLbl]] : []),
  ])}
  <h3>Overall Assessment</h3>
  <p class="assessment">${esc(assessment)}</p>
  <div class="footer"><span>Aiola CPA, PLLC &mdash; Confidential</span><span>${esc(trainee.name)}</span></div>
</div>

<!-- PAGE 3: KPI Performance -->
<div class="page section">
  <div class="section-title">KPI Performance</div>
  ${kpiHtml}
  <div class="footer"><span>Aiola CPA, PLLC &mdash; Confidential</span><span>${esc(trainee.name)}</span></div>
</div>

<!-- PAGE 4: Training Progress -->
<div class="page section">
  <div class="section-title">Training Progress by Phase</div>
  ${progressHtml}
  <div class="footer"><span>Aiola CPA, PLLC &mdash; Confidential</span><span>${esc(trainee.name)}</span></div>
</div>

<!-- PAGE 5: Presentation Scorecards -->
<div class="page section">
  <div class="section-title">📊 Presentation Scorecards</div>
  ${scorecardHtml}
  <div class="footer"><span>Aiola CPA, PLLC &mdash; Confidential</span><span>${esc(trainee.name)}</span></div>
</div>

<!-- PAGE 6: Notes & Badges -->
<div class="page section">
  <div class="section-title">${isTraineeReport ? "Feedback &amp; Badges" : "Manager Observations"}</div>
  ${notesHtml}
  <div class="footer"><span>Aiola CPA, PLLC &mdash; Confidential</span><span>${esc(trainee.name)}</span></div>
</div>

<!-- PAGE 6: AI Assistant Activity -->
<div class="page section">
  <div class="section-title">AI Training Assistant Activity</div>
  ${chatHtml}
  <div class="footer"><span>Aiola CPA, PLLC &mdash; Confidential</span><span>${esc(trainee.name)}</span></div>
</div>

</body>
</html>`;

  // Open in new window and trigger print
  const win = window.open('', '_blank');
  if (!win) {
    alert("Please allow pop-ups to generate the report.");
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);

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

function TeamKpiChart({ trainees, allKpiData }) {
  const chartW = 600, chartH = 220, padL = 44, padR = 20, padT = 14, padB = 44;
  const plotW = chartW - padL - padR, plotH = chartH - padT - padB;
  const maxScore = 5;
  const benchmark = 4.0;
  const barColor = (score, target) => score >= target ? B.ok : score >= target - 0.3 ? B.warn : B.err;

  const traineeKpiData = (trainees || []).map(t => {
    const tk = (allKpiData && allKpiData[t.id]) || {};
    const commE = tk.communication || [];
    const teamE = tk.teamwork || [];
    const commA = commE.length > 0 ? commE.reduce((a,e)=>a+e.score,0)/commE.length : null;
    const teamA = teamE.length > 0 ? teamE.reduce((a,e)=>a+e.score,0)/teamE.length : null;
    const d = daysSince(t.startDate);
    const phaseKey = d <= 30 ? "day30" : d <= 60 ? "day60" : "day90";
    const commTarget = ONBOARDING_KPIS.find(k=>k.id==="communication")?.targets?.[phaseKey] || 4;
    const teamTarget = ONBOARDING_KPIS.find(k=>k.id==="teamwork")?.targets?.[phaseKey] || 4;
    return { name: t.name.split(" ")[0], commAvg: commA, teamAvg: teamA, commTarget, teamTarget };
  });

  const hasData = traineeKpiData.length > 0;
  const groupW = hasData ? plotW / traineeKpiData.length : 1;
  const barW = hasData ? Math.min(groupW * 0.28, 28) : 20;
  const benchmarkY = padT + plotH - (benchmark / maxScore * plotH);

  return (
    <div style={{background:"#fff",borderRadius:12,border:"2px solid #e2e8f0",boxShadow:"0 2px 6px rgba(0,0,0,.06)",padding:"18px 24px",marginBottom:28,minHeight:180}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <span style={{fontSize:14,fontWeight:700,color:B.navy}}>Team KPI Overview</span>
        <div style={{display:"flex",alignItems:"center",gap:14,fontSize:10,color:B.t3}}>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:B.blue,display:"inline-block"}}/> Communication</span>
          <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:B.purple,display:"inline-block"}}/> Teamwork</span>
        </div>
      </div>
      {!hasData ? (
        <div style={{textAlign:"center",padding:"32px 0",color:B.t3,fontSize:12}}>No trainees enrolled yet. KPI data will appear here once trainees are added.</div>
      ) : (
        <svg width="100%" height="200" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="xMidYMid meet" style={{display:"block"}}>
          {/* Background */}
          <rect x="0" y="0" width={chartW} height={chartH} fill="#fff" rx="4"/>
          {/* Y-axis gridlines and labels */}
          {[0,1,2,3,4,5].map(v => {
            const yy = padT + plotH - (v / maxScore * plotH);
            return <g key={v}><line x1={padL} y1={yy} x2={chartW-padR} y2={yy} stroke="#e2e8f0" strokeWidth="1"/><text x={padL-8} y={yy+4} textAnchor="end" fontSize="10" fill="#64748b">{v}</text></g>;
          })}
          {/* Benchmark line */}
          <line x1={padL} y1={benchmarkY} x2={chartW-padR} y2={benchmarkY} stroke={B.blue} strokeWidth="1.5" strokeDasharray="6,4" opacity=".6"/>
          <text x={chartW-padR+4} y={benchmarkY+4} fontSize="9" fill={B.blue} fontWeight="600" opacity=".8">4.0</text>
          {/* Bars */}
          {traineeKpiData.map((td, i) => {
            const cx = padL + groupW * i + groupW / 2;
            const commH = td.commAvg !== null ? (td.commAvg / maxScore * plotH) : 0;
            const teamH = td.teamAvg !== null ? (td.teamAvg / maxScore * plotH) : 0;
            const commColor = td.commAvg !== null ? barColor(td.commAvg, td.commTarget) : "#cbd5e1";
            const noDataH = plotH * 0.15;
            return <g key={i}>
              {/* Communication bar */}
              <rect x={cx - barW - 2} y={padT + plotH - (td.commAvg !== null ? commH : noDataH)} width={barW} height={Math.max(td.commAvg !== null ? commH : noDataH, 4)} rx="3" fill={commColor} opacity={td.commAvg !== null ? 1 : .25}/>
              {/* Teamwork bar */}
              <rect x={cx + 2} y={padT + plotH - (td.teamAvg !== null ? teamH : noDataH)} width={barW} height={Math.max(td.teamAvg !== null ? teamH : noDataH, 4)} rx="3" fill={td.teamAvg !== null ? B.purple : "#cbd5e1"} opacity={td.teamAvg !== null ? .85 : .25}/>
              {/* Score labels */}
              {td.commAvg !== null && <text x={cx - barW/2 - 2} y={padT + plotH - commH - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill={commColor}>{td.commAvg.toFixed(1)}</text>}
              {td.teamAvg !== null && <text x={cx + barW/2 + 2} y={padT + plotH - teamH - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill={B.purple}>{td.teamAvg.toFixed(1)}</text>}
              {td.commAvg === null && td.teamAvg === null && <text x={cx} y={padT + plotH - noDataH - 5} textAnchor="middle" fontSize="9" fill="#94a3b8">No data</text>}
              {/* Name label */}
              <text x={cx} y={chartH - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="#334155">{td.name}</text>
            </g>;
          })}
        </svg>
      )}
    </div>
  );
}

function AdminDashboard({ user, allData, onViewTrainee, onViewPerformance, onGenerateReport, onLogout, kpiData: allKpiData }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTrack, setNewTrack] = useState("Advisory");
  const [trainees, setTrainees] = useState(MOCK_TRAINEES);
  const [trackFilter, setTrackFilter] = useState("All");
  const [adminTab, setAdminTab] = useState("training");
  const [drillDown, setDrillDown] = useState(null); // {type:"deadlines"|"quizzes"|"kpi", data:[...]}

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
          {[{key:"training",label:"Training Portal"},{key:"cohort",label:"Cohort Topics"},{key:"client",label:"Client Portal"}].map(tab=>(
            <button key={tab.key} onClick={()=>setAdminTab(tab.key)} style={{padding:"10px 4px",border:"none",borderBottom:adminTab===tab.key?`2px solid ${B.blue}`:"2px solid transparent",background:"none",cursor:"pointer",fontSize:14,fontWeight:600,color:adminTab===tab.key?B.blue:B.t3,fontFamily:"inherit",transition:"color .2s"}}>
              {tab.label}
            </button>
          ))}
        </div>
        {adminTab==="cohort"&&<CohortHeatmap trainees={trainees} />}
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
              <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3}}>Assessments Overdue</span>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke={allOverdueQuizzes.length>0?B.warn:B.ok} strokeWidth="1.5"/><text x="10" y="14" textAnchor="middle" fontSize="12" fontWeight="700" fill={allOverdueQuizzes.length>0?B.warn:B.ok}>?</text></svg>
            </div>
            <div style={{fontSize:28,fontWeight:700,color:allOverdueQuizzes.length>0?B.warn:B.ok}}>{allOverdueQuizzes.length}</div>
            <div style={{fontSize:10,color:B.t3,marginTop:4}}>{allOverdueQuizzes.length>0?"Click to view details":"All assessments passed on time"}</div>
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

        {/* Team KPI Overview Chart — always rendered */}
        <TeamKpiChart trainees={trainees} allKpiData={allKpiData}/>

        {/* Drill-Down Modal */}
        {drillDown && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,fontFamily:"'DM Sans',sans-serif"}} onClick={()=>setDrillDown(null)}>
            <div style={{background:"#fff",borderRadius:16,padding:"28px 32px",maxWidth:640,width:"90%",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 25px 50px rgba(0,0,0,.2)"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                <h3 style={{margin:0,fontSize:18,fontWeight:700,color:B.navy}}>
                  {drillDown.type==="deadlines"?"Missed Deadlines":drillDown.type==="quizzes"?"Overdue Assessments":"KPI Breakdown"}
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
                ? <p style={{fontSize:13,color:B.ok,textAlign:"center",padding:20}}>All assessments passed on time!</p>
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
            <span>Name</span><span>Phase</span><span>Start Date</span><span>Timeline</span><span>Progress</span><span>Assessments</span><span></span>
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
                <span style={{fontSize:12,color:B.t2}} title="Passed / Total">{prog.passedQuizzes}/{totalQuizzes}</span>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>onViewTrainee(t)} style={{padding:"5px 10px",border:`1px solid ${B.blue}`,borderRadius:6,background:"#fff",color:B.blue,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>View</button>
                  <button onClick={()=>onViewPerformance(t)} style={{padding:"5px 10px",border:`1px solid ${B.purple}`,borderRadius:6,background:"#fff",color:B.purple,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Performance</button>
                  <button onClick={()=>onGenerateReport(t)} style={{padding:"5px 10px",border:`1px solid ${B.ok}`,borderRadius:6,background:"#fff",color:B.ok,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:3}}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h5.59L13 4.91V14.5H4V1.5z" stroke="currentColor" strokeWidth="1.3"/><path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.3"/><path d="M7 8v4m0 0l-2-2m2 2l2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Report
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
        </>}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TRAINEE PORTAL
// ═════════════════════════════════════════════════════════════════════════════

function TraineePortal({ user, completedTasks, quizResults, onToggleTask, onPassQuiz, onLogout, isAdminView, onBackToAdmin, onGenerateReport, notes, badges, onAddNote, onAddBadge, onUpdateBadge, kpiData, scorecards, onAddScorecard, onAddKpiScore, initialPerfPage, getTaskText, getResource, getItemDescription, getObjective, getRubricCategory, getDeliverable, getRealWorld, onSetOverride, overrides }) {
  const [aP, setAP] = useState("week1");
  const [aI, setAI] = useState("d1");
  const [qM, setQM] = useState(null); // which item's quiz is open
  const [qIdx, setQIdx] = useState(0); // current question index
  const [qAns, setQAns] = useState({}); // {questionId: selectedIndex | freeText}
  const [qSubs, setQSubs] = useState({}); // {questionId: true} submitted
  const [qDone, setQDone] = useState(false); // showing summary
  const [sO, setSO] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  const [eP, setEP] = useState({week1:true});
  const [perfPage, setPerfPage] = useState(!!initialPerfPage);
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [scorecardForm, setScorecardForm] = useState(null);
  const [expandedScorecards, setExpandedScorecards] = useState({});
  const [kpiSubmitForm, setKpiSubmitForm] = useState(null);
  // Inline edit state for admin overrides: { key, text, label, url, name, desc, description }
  const [editingOverride, setEditingOverride] = useState(null);
  // Shared pencil button style for all admin edit icons
  const PENCIL_STYLE = {flexShrink:0,background:"none",border:"none",borderRadius:4,cursor:"pointer",padding:"2px 4px",fontSize:13,color:B.t3,opacity:.85,transition:"opacity .15s, background .15s"};
  const pencilHoverOn = e => {e.currentTarget.style.opacity="1";e.currentTarget.style.background="#dbeafe";};
  const pencilHoverOff = e => {e.currentTarget.style.opacity=".85";e.currentTarget.style.background="none";};
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
      <aside className={sO?"r-trainee-sidebar":""} style={{width:sO?300:0,minWidth:sO?300:0,background:"#fff",borderRight:`1px solid ${B.bdr}`,display:"flex",flexDirection:"column",overflow:"hidden",transition:"width .3s,min-width .3s"}}>
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
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:B.t3}}><span>{prog.doneTasks}/{totalTasks} tasks</span><span>{prog.passedQuizzes}/{totalQuizzes} assessments</span></div>
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
                  <TrophySvg size={32} color={m.unlocked ? m.color : "#d1d5db"} glow={m.unlocked}/>
                </div>
                <span style={{fontSize:10,fontWeight:600,color:m.unlocked?m.color:B.t3}}>{m.done}/{m.total}</span>
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
                    {phase.items.length === 1 ? (
                      <button onClick={()=>{sel(phase.id,phase.items[0].id);}}
                        style={{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"6px 20px",border:"none",background:"none",cursor:"pointer",fontSize:12,fontWeight:600,color:aP===phase.id&&!perfPage?B.blue:B.t1,fontFamily:"inherit",textAlign:"left"}}>
                        <span style={{width:7,height:7,borderRadius:4,flexShrink:0,background:pp===100?B.ok:pp>0?B.blue:B.bdr}}/><span style={{flex:1}}>{phase.label}</span>
                        {pp===100?<span style={{width:16,height:16,borderRadius:8,background:B.ok,display:"flex",alignItems:"center",justifyContent:"center"}}><Chk/></span>:<span style={{fontSize:10,color:B.t3}}>{pp}%</span>}
                      </button>
                    ) : (<>
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
                    </>)}
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
        {/* Tab bar — My Performance toggle */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 28px 0",background:B.bg}}>
          <button onClick={()=>setPerfPage(false)} style={{padding:"7px 16px",border:"none",borderRadius:8,background:!perfPage?B.navy:"#fff",color:!perfPage?"#fff":B.t2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:!perfPage?"0 1px 3px rgba(0,0,0,.12)":"none",border:perfPage?`1px solid ${B.bdr}`:"1px solid transparent",transition:"all .15s"}}>
            Training Content
          </button>
          <button onClick={goPerf} style={{padding:"7px 16px",border:"none",borderRadius:8,background:perfPage?B.blue:"#fff",color:perfPage?"#fff":B.t2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:perfPage?"0 1px 3px rgba(0,0,0,.12)":"none",border:!perfPage?`1px solid ${B.bdr}`:"1px solid transparent",transition:"all .15s",display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:14}}>📊</span> My Performance
          </button>
        </div>
        {/* My Performance Page */}
        {perfPage && (
          <div className="r-trainee-content" style={{padding:"24px 28px",maxWidth:1200,width:"100%"}}>
            {/* Generate My Report button — trainee only */}
            {!isAdminView && onGenerateReport && (
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
                <button onClick={onGenerateReport} style={{padding:"8px 18px",border:"none",borderRadius:8,background:B.blue,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M4 1.5h5.59L13 4.91V14.5H4V1.5z" stroke="#fff" strokeWidth="1.3"/><path d="M9.5 1.5V5H13" stroke="#fff" strokeWidth="1.3"/><path d="M7 8v4m0 0l-2-2m2 2l2-2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Generate My Report
                </button>
              </div>
            )}
            {/* Weekly Review */}
            {!isAdminView && <WeeklyReview userId={user.id} />}
            {/* Topic Mastery */}
            <TopicMastery userId={user.id} />
            {/* Confident Misses — admin only */}
            {isAdminView && <ConfidentMisses userId={user.id} />}
            {/* Card 1: KPI Scores */}
            <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
              <div style={{padding:"14px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>📈</span><span style={{fontSize:13,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>KPI Scores</span></div>
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
              {/* Admin KPI Submit Form */}
              {isAdminView && onAddKpiScore && (
                <div style={{borderTop:`1px solid ${B.bdr}`,padding:"12px 18px"}}>
                  {!kpiSubmitForm ? (
                    <button onClick={()=>{ const d=daysSince(user.startDate); setKpiSubmitForm({kpiId:"communication",phase:d<=30?"day30":d<=60?"day60":"day90",score:"",date:new Date().toISOString().slice(0,10),comment:""}); }}
                      style={{padding:"6px 14px",border:"none",borderRadius:8,background:B.blue,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Submit New Score</button>
                  ) : (
                    <form onSubmit={(e)=>{
                      e.preventDefault();
                      const s=parseFloat(kpiSubmitForm.score);
                      if(isNaN(s)||s<1||s>5)return;
                      const all=kpiData?.[kpiSubmitForm.kpiId]||[];
                      const maxWeek=all.length>0?Math.max(...all.map(en=>en.week)):0;
                      onAddKpiScore(user.id,kpiSubmitForm.kpiId,{week:maxWeek+1,score:s,manager:"Nick Aiola",date:kpiSubmitForm.date,comment:kpiSubmitForm.comment,phase:kpiSubmitForm.phase});
                      setKpiSubmitForm(null);
                    }} style={{display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                        <div>
                          <label style={{display:"block",fontSize:10,fontWeight:600,color:B.t2,marginBottom:3}}>KPI Category</label>
                          <select value={kpiSubmitForm.kpiId} onChange={e=>setKpiSubmitForm(p=>({...p,kpiId:e.target.value}))}
                            style={{width:"100%",padding:"8px 10px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif",color:B.t1,background:"#fff"}}>
                            {ONBOARDING_KPIS.map(k=><option key={k.id} value={k.id}>{k.category}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{display:"block",fontSize:10,fontWeight:600,color:B.t2,marginBottom:3}}>Phase</label>
                          <select value={kpiSubmitForm.phase} onChange={e=>setKpiSubmitForm(p=>({...p,phase:e.target.value}))}
                            style={{width:"100%",padding:"8px 10px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif",color:B.t1,background:"#fff"}}>
                            <option value="day30">30-Day Phase</option>
                            <option value="day60">60-Day Phase</option>
                            <option value="day90">90-Day Phase</option>
                          </select>
                        </div>
                        <div>
                          <label style={{display:"block",fontSize:10,fontWeight:600,color:B.t2,marginBottom:3}}>Score (1.0–5.0)</label>
                          <input type="number" min="1" max="5" step="0.1" value={kpiSubmitForm.score} onChange={e=>setKpiSubmitForm(p=>({...p,score:e.target.value}))} placeholder="e.g. 4.2" required
                            style={{width:"100%",padding:"8px 10px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif",color:B.t1,boxSizing:"border-box"}}/>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}>
                        <div>
                          <label style={{display:"block",fontSize:10,fontWeight:600,color:B.t2,marginBottom:3}}>Date</label>
                          <input type="date" value={kpiSubmitForm.date} onChange={e=>setKpiSubmitForm(p=>({...p,date:e.target.value}))}
                            style={{width:"100%",padding:"8px 10px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif",color:B.t1,boxSizing:"border-box"}}/>
                        </div>
                        <div>
                          <label style={{display:"block",fontSize:10,fontWeight:600,color:B.t2,marginBottom:3}}>Comment (optional)</label>
                          <input type="text" value={kpiSubmitForm.comment} onChange={e=>setKpiSubmitForm(p=>({...p,comment:e.target.value}))} placeholder="Brief note..."
                            style={{width:"100%",padding:"8px 10px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif",color:B.t1,boxSizing:"border-box"}}/>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button type="submit" style={{padding:"8px 18px",border:"none",borderRadius:6,background:B.blue,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Submit Score</button>
                        <button type="button" onClick={()=>setKpiSubmitForm(null)} style={{padding:"8px 18px",border:`1px solid ${B.bdr}`,borderRadius:6,background:"#fff",color:B.t2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Weekly KPI Drill-Down (inside Card 1) */}
            {(commEntries.length > 0 || teamEntries.length > 0) && (
              <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
                <div style={{padding:"14px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>📅</span><span style={{fontSize:12,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Weekly Score Breakdown</span></div>
                <div style={{padding:"14px 18px"}}>
                  {(()=>{
                    const COMM_QUESTIONS = ["Responds timely and with urgency","Provides complete and accurate information","Meets deadlines","Communication clarity","Teamwork and collaboration"];
                    const allWeeks = new Set();
                    commEntries.forEach(e => allWeeks.add(e.week));
                    teamEntries.forEach(e => allWeeks.add(e.week));
                    const weekNums = [...allWeeks].sort((a,b)=>a-b);
                    return weekNums.map(w => {
                      const cEntry = commEntries.find(e => e.week === w);
                      const tEntry = teamEntries.find(e => e.week === w);
                      const isTeamPulse = tEntry && tEntry.manager === "Team Survey";
                      const wKey = "w" + w;
                      const isOpen = !!expandedWeeks[wKey];
                      return (
                        <div key={w} style={{marginBottom:6}}>
                          <button onClick={()=>setExpandedWeeks(p=>({...p,[wKey]:!p[wKey]}))} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",border:`1px solid ${B.bdr}`,borderRadius:8,background:isOpen?"#f8fafc":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,color:B.t1,transition:"background .15s"}}>
                            <span>Week {w}{isTeamPulse && !cEntry ? " (Team Pulse)" : ""}</span>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              {cEntry && <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:B.blueL,color:B.blue}}>Comm: {cEntry.score.toFixed(1)}</span>}
                              {tEntry && <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,background:"#faf5ff",color:B.purple}}>Team: {tEntry.score.toFixed(1)}</span>}
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{transition:"transform .15s",transform:isOpen?"rotate(180deg)":"none"}}><path d="M2 3.5l3 3 3-3" stroke={B.t3} strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </div>
                          </button>
                          {isOpen && (
                            <div style={{padding:"10px 12px 6px",borderLeft:`2px solid ${B.blueM}`,marginLeft:12,marginTop:4}}>
                              {cEntry && (
                                <>
                                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:B.blue,marginBottom:6}}>Communication</div>
                                  <table style={{width:"100%",borderCollapse:"collapse",marginBottom:10}}>
                                    <thead><tr style={{borderBottom:`1px solid ${B.bdr}`}}>
                                      <th style={{textAlign:"left",fontSize:10,fontWeight:600,color:B.t3,padding:"4px 8px"}}>Question</th>
                                      <th style={{textAlign:"center",fontSize:10,fontWeight:600,color:B.t3,padding:"4px 8px",width:50}}>Score</th>
                                      <th style={{textAlign:"left",fontSize:10,fontWeight:600,color:B.t3,padding:"4px 8px"}}>Comment</th>
                                    </tr></thead>
                                    <tbody>{COMM_QUESTIONS.map((q,qi) => (
                                      <tr key={qi} style={{borderBottom:`1px solid #f1f5f9`}}>
                                        <td style={{fontSize:11,color:B.t2,padding:"5px 8px"}}>{q}</td>
                                        <td style={{textAlign:"center",fontSize:11,fontWeight:600,color:B.navy,padding:"5px 8px"}}>{cEntry.score.toFixed(1)}</td>
                                        <td style={{fontSize:11,color:B.t3,padding:"5px 8px"}}>{qi === 0 ? (cEntry.comment || "") : ""}</td>
                                      </tr>
                                    ))}</tbody>
                                  </table>
                                </>
                              )}
                              {tEntry && (
                                <>
                                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:B.purple,marginBottom:6}}>Teamwork {isTeamPulse ? "(Team Pulse)" : ""}</div>
                                  {isTeamPulse ? (
                                    <div style={{padding:"6px 8px",background:"#faf5ff",borderRadius:6,marginBottom:6}}>
                                      <div style={{fontSize:11,color:B.t2}}>Team Pulse averaged score: <strong style={{color:B.navy}}>{tEntry.score.toFixed(1)}</strong></div>
                                      {tEntry.comment && <div style={{fontSize:10,color:B.t3,marginTop:2}}>{tEntry.comment}</div>}
                                    </div>
                                  ) : (
                                    <table style={{width:"100%",borderCollapse:"collapse",marginBottom:6}}>
                                      <thead><tr style={{borderBottom:`1px solid ${B.bdr}`}}>
                                        <th style={{textAlign:"left",fontSize:10,fontWeight:600,color:B.t3,padding:"4px 8px"}}>Question</th>
                                        <th style={{textAlign:"center",fontSize:10,fontWeight:600,color:B.t3,padding:"4px 8px",width:50}}>Score</th>
                                        <th style={{textAlign:"left",fontSize:10,fontWeight:600,color:B.t3,padding:"4px 8px"}}>Comment</th>
                                      </tr></thead>
                                      <tbody>
                                        <tr style={{borderBottom:`1px solid #f1f5f9`}}>
                                          <td style={{fontSize:11,color:B.t2,padding:"5px 8px"}}>Teamwork and collaboration</td>
                                          <td style={{textAlign:"center",fontSize:11,fontWeight:600,color:B.navy,padding:"5px 8px"}}>{tEntry.score.toFixed(1)}</td>
                                          <td style={{fontSize:11,color:B.t3,padding:"5px 8px"}}>{tEntry.comment || ""}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  )}
                                </>
                              )}
                              {!cEntry && !tEntry && <div style={{fontSize:11,color:B.t3,fontStyle:"italic"}}>No scores recorded for this week.</div>}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Card 2: Achievements & Milestones */}
            <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
              <div style={{padding:"14px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>🏆</span><span style={{fontSize:13,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Achievements & Milestones</span></div>
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

            {/* Card 3: Manager Feedback */}
            <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden"}}>
              <div style={{padding:"14px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>💬</span><span style={{fontSize:13,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Manager Feedback</span></div>
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
                          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:B.t3,marginBottom:2}}>
                            <span>{note.author} · {new Date(note.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
                            {note.phase && <span style={{fontSize:8,fontWeight:600,padding:"1px 6px",borderRadius:4,background:B.blueL,color:B.blue}}>{note.phase==="day30"?"Days 1–30":note.phase==="day60"?"Days 31–60":"Days 61–90"}</span>}
                          </div>
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
                          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:B.t3,marginBottom:2}}>
                            <span>{note.author} · {new Date(note.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>
                            {note.phase && <span style={{fontSize:8,fontWeight:600,padding:"1px 6px",borderRadius:4,background:B.blueL,color:B.blue}}>{note.phase==="day30"?"Days 1–30":note.phase==="day60"?"Days 31–60":"Days 61–90"}</span>}
                          </div>
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

            {/* Card 4: Presentation Scorecards */}
            {(()=>{
              // Collect all deliverables that have a weeklyRubric on their parent item (exclude assessment deliverables)
              const scorecardDeliverables = [];
              PHASES.forEach(phase => { phase.items.forEach(item => {
                if (item.weeklyRubric && item.deliverables) {
                  item.deliverables.forEach(d => {
                    if (d.id.endsWith("_assessment")) return;
                    scorecardDeliverables.push({ ...d, weekItemId: item.id, rubric: item.weeklyRubric });
                  });
                }
              }); });
              const userScorecards = (scorecards || []).slice().sort((a,b) => new Date(b.date) - new Date(a.date));
              const bandColor = (band) => band === "Mastery" ? B.ok : band === "Proficient" ? B.blue : band === "Developing" ? B.warn : "#DC2626";
              const bandBg = (band) => band === "Mastery" ? B.okL : band === "Proficient" ? B.blueL : band === "Developing" ? B.warnL : "#fee2e2";
              const phaseLabel = (p) => p === "day30" ? "Days 1–30" : p === "day60" ? "Days 31–60" : "Days 61–90";
              return (
                <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginTop:20}}>
                  <div style={{padding:"14px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>📊</span><span style={{fontSize:13,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Presentation Scorecards</span></div>
                    {isAdminView && onAddScorecard && scorecardDeliverables.length > 0 && (
                      <button onClick={()=>setScorecardForm(p => p ? null : { deliverableId: scorecardDeliverables[0].id, scores: {}, overallNotes: "" })}
                        style={{padding:"6px 14px",border:"none",borderRadius:8,background:scorecardForm?B.bdr:B.blue,color:scorecardForm?B.t2:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                        {scorecardForm ? "Cancel" : "+ Add Scorecard"}
                      </button>
                    )}
                  </div>
                  {/* Admin scorecard form */}
                  {isAdminView && scorecardForm && (()=>{
                    const selDeliv = scorecardDeliverables.find(d => d.id === scorecardForm.deliverableId) || scorecardDeliverables[0];
                    const rubricCats = selDeliv?.rubric?.categories || [];
                    const handleScFormSubmit = (e) => {
                      e.preventDefault();
                      const scores = {};
                      rubricCats.forEach(cat => {
                        scores[cat.num] = { score: parseInt(scorecardForm.scores[cat.num]?.score) || 1, notes: scorecardForm.scores[cat.num]?.notes || "" };
                      });
                      const { total, band } = computeScorecard(scores);
                      const entry = {
                        id: "sc_" + Date.now(),
                        deliverableId: selDeliv.id,
                        weekItemId: selDeliv.weekItemId,
                        date: new Date().toISOString().slice(0,10),
                        submittedBy: "Nick Aiola",
                        phase: inferScorecardPhase(daysSince(user.startDate)),
                        scores,
                        total,
                        band,
                        overallNotes: scorecardForm.overallNotes || ""
                      };
                      onAddScorecard(user.id, entry);
                      setScorecardForm(null);
                    };
                    return (
                      <form onSubmit={handleScFormSubmit} style={{padding:"18px",borderBottom:`1px solid ${B.bdr}`,background:"#f8fafc"}}>
                        <div style={{marginBottom:14}}>
                          <label style={{display:"block",fontSize:11,fontWeight:600,color:B.t2,marginBottom:4}}>Deliverable</label>
                          <select value={scorecardForm.deliverableId} onChange={e => setScorecardForm(p => ({...p, deliverableId: e.target.value, scores: {}}))}
                            style={{width:"100%",padding:"10px 12px",border:`1px solid ${B.bdr}`,borderRadius:8,fontSize:13,fontFamily:"'DM Sans',sans-serif",color:B.t1,background:"#fff"}}>
                            {scorecardDeliverables.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                          </select>
                        </div>
                        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:B.t3,marginBottom:10}}>Category Scores (1–4)</div>
                        {rubricCats.map(cat => (
                          <div key={cat.num} style={{marginBottom:12,padding:"10px 14px",background:"#fff",borderRadius:8,border:`1px solid ${B.bdr}`}}>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                              <div>
                                <span style={{fontSize:12,fontWeight:700,color:B.navy}}>{cat.num}. {cat.name}</span>
                                <div style={{fontSize:10,color:B.t3,marginTop:1}}>{cat.desc}</div>
                              </div>
                              <div style={{display:"flex",gap:4,flexShrink:0,marginLeft:12}}>
                                {[1,2,3,4].map(s => (
                                  <button key={s} type="button" onClick={()=>setScorecardForm(p=>({...p,scores:{...p.scores,[cat.num]:{...(p.scores[cat.num]||{}),score:s}}}))}
                                    style={{width:32,height:32,borderRadius:8,border:`2px solid ${(scorecardForm.scores[cat.num]?.score===s)?B.blue:B.bdr}`,background:(scorecardForm.scores[cat.num]?.score===s)?B.blueL:"#fff",color:(scorecardForm.scores[cat.num]?.score===s)?B.blue:B.t2,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <textarea placeholder="Notes (optional)" value={scorecardForm.scores[cat.num]?.notes||""} onChange={e=>setScorecardForm(p=>({...p,scores:{...p.scores,[cat.num]:{...(p.scores[cat.num]||{}),notes:e.target.value}}}))}
                              style={{width:"100%",padding:"6px 10px",border:`1px solid ${B.bdr}`,borderRadius:6,fontSize:11,fontFamily:"'DM Sans',sans-serif",color:B.t2,resize:"vertical",minHeight:28,boxSizing:"border-box"}}/>
                          </div>
                        ))}
                        <div style={{marginBottom:14}}>
                          <label style={{display:"block",fontSize:11,fontWeight:600,color:B.t2,marginBottom:4}}>Overall Notes</label>
                          <textarea value={scorecardForm.overallNotes} onChange={e=>setScorecardForm(p=>({...p,overallNotes:e.target.value}))}
                            style={{width:"100%",padding:"10px 12px",border:`1px solid ${B.bdr}`,borderRadius:8,fontSize:12,fontFamily:"'DM Sans',sans-serif",color:B.t1,resize:"vertical",minHeight:48,boxSizing:"border-box"}} placeholder="Overall feedback..."/>
                        </div>
                        <button type="submit" style={{padding:"10px 24px",border:"none",borderRadius:8,background:B.blue,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Submit Scorecard</button>
                      </form>
                    );
                  })()}
                  {/* Scorecard entries */}
                  <div style={{padding:"14px 18px"}}>
                    {userScorecards.length === 0 ? (
                      <div style={{padding:"20px 0",textAlign:"center",fontSize:12,color:B.t3}}>
                        {isAdminView ? "No scorecards submitted yet. Use the button above to score a presentation." : "No scorecards yet. Your manager will score your presentations as you deliver them."}
                      </div>
                    ) : userScorecards.map(sc => {
                      const deliv = scorecardDeliverables.find(d => d.id === sc.deliverableId);
                      const rubricCats = deliv?.rubric?.categories || [];
                      const isExpanded = expandedScorecards[sc.id];
                      return (
                        <div key={sc.id} style={{marginBottom:10}}>
                          <button onClick={()=>setExpandedScorecards(p=>({...p,[sc.id]:!p[sc.id]}))}
                            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",border:`1px solid ${B.bdr}`,borderRadius:isExpanded?"8px 8px 0 0":"8px",background:isExpanded?"#f8fafc":"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,color:B.t1,transition:"background .15s"}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <span>{deliv?.title || sc.deliverableId}</span>
                              <span style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:4,background:bandBg(sc.band),color:bandColor(sc.band)}}>{sc.band} ({sc.total}/20)</span>
                              <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:B.blueL,color:B.blue}}>{phaseLabel(sc.phase)}</span>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <span style={{fontSize:10,color:B.t3}}>{new Date(sc.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{transition:"transform .15s",transform:isExpanded?"rotate(180deg)":"none"}}><path d="M2 3.5l3 3 3-3" stroke={B.t3} strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </div>
                          </button>
                          {isExpanded && (
                            <div style={{padding:"12px 14px",border:`1px solid ${B.bdr}`,borderTop:"none",borderRadius:"0 0 8px 8px",background:"#fff"}}>
                              <div style={{fontSize:10,color:B.t3,marginBottom:10}}>Submitted by {sc.submittedBy}</div>
                              {rubricCats.map(cat => {
                                const catScore = sc.scores?.[cat.num];
                                if (!catScore) return null;
                                const scoreColor = catScore.score >= 4 ? B.ok : catScore.score >= 3 ? B.blue : catScore.score >= 2 ? B.warn : "#DC2626";
                                return (
                                  <div key={cat.num} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"6px 0",borderBottom:`1px solid #f1f5f9`}}>
                                    <div style={{width:32,height:32,borderRadius:8,background:scoreColor+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:scoreColor,flexShrink:0}}>{catScore.score}</div>
                                    <div style={{flex:1}}>
                                      <div style={{fontSize:12,fontWeight:600,color:B.t1}}>{cat.name}</div>
                                      {catScore.notes && <div style={{fontSize:11,color:B.t3,marginTop:2}}>{catScore.notes}</div>}
                                    </div>
                                  </div>
                                );
                              })}
                              {sc.overallNotes && (
                                <div style={{marginTop:10,padding:"10px 12px",background:"#f8fafc",borderRadius:6,border:`1px solid ${B.bdr}`}}>
                                  <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:B.t3,marginBottom:4}}>Overall Notes</div>
                                  <div style={{fontSize:12,color:B.t1,lineHeight:1.5}}>{sc.overallNotes}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {/* Section content */}
        {!perfPage&&cIt&&(
          <div className="r-trainee-content" style={{padding:"24px 28px",maxWidth:1200,width:"100%"}}>
            {(()=>{
              const descKey = `description::${cIt.id}`;
              const descText = getItemDescription ? getItemDescription(cIt.id, cIt.description) : cIt.description;
              if (editingOverride?.key === descKey) {
                const saveDesc = () => { const val=editingOverride.text.trim(); if(!val){setEditingOverride(null);return;} if(val===cIt.description)onSetOverride(descKey,null); else onSetOverride(descKey,{text:val}); setEditingOverride(null); };
                return <div style={{marginBottom:20}}>
                  <textarea value={editingOverride.text} onChange={e=>setEditingOverride({...editingOverride,text:e.target.value})} onKeyDown={e=>{if(e.key==="Escape")setEditingOverride(null);}} rows={4} style={{width:"100%",fontSize:13,color:B.t2,lineHeight:1.6,padding:"8px 10px",border:`1px solid ${B.blue}`,borderRadius:6,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <button onClick={saveDesc} style={{fontSize:11,padding:"4px 12px",borderRadius:4,border:"none",background:B.blue,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Save</button>
                    <button onClick={()=>setEditingOverride(null)} style={{fontSize:11,padding:"4px 12px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",color:B.t2,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                    {overrides?.[descKey] && <button onClick={()=>{onSetOverride(descKey,null);setEditingOverride(null);}} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",color:"#DC2626",cursor:"pointer",fontFamily:"inherit"}}>Reset to default</button>}
                  </div>
                </div>;
              }
              return <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:20}}>
                <p style={{fontSize:13,color:B.t2,lineHeight:1.6,marginTop:0,marginBottom:0,flex:1}}>{descText}</p>
                {isAdminView && onSetOverride && <button onClick={()=>setEditingOverride({key:descKey,text:descText})} style={PENCIL_STYLE} onMouseEnter={pencilHoverOn} onMouseLeave={pencilHoverOff} title="Edit description">✏️</button>}
              </div>;
            })()}
            {cIt.learningObjectives?.length > 0 && (
              <div style={{background:B.blueL,border:`1px solid ${B.blue}22`,borderRadius:10,padding:"14px 18px",marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14" stroke={B.blue} strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <span style={{fontSize:11,fontWeight:700,color:B.blue,textTransform:"uppercase",letterSpacing:.8}}>Learning Objectives</span>
                </div>
                <ul style={{margin:0,paddingLeft:18,listStyleType:"disc"}}>
                  {cIt.learningObjectives.map((obj,i)=>{
                    const objKey = `objective::${cIt.id}::${i}`;
                    const objText = getObjective ? getObjective(cIt.id, i, obj) : obj;
                    if (editingOverride?.key === objKey) {
                      const saveObj = () => { const val=editingOverride.text.trim(); if(!val){setEditingOverride(null);return;} if(val===obj)onSetOverride(objKey,null); else onSetOverride(objKey,{text:val}); setEditingOverride(null); };
                      return <li key={i} style={{fontSize:12,color:B.t1,lineHeight:1.6,marginBottom:4}}>
                        <input value={editingOverride.text} onChange={e=>setEditingOverride({...editingOverride,text:e.target.value})} onKeyDown={e=>{if(e.key==="Enter")saveObj();if(e.key==="Escape")setEditingOverride(null);}} style={{width:"100%",fontSize:12,padding:"4px 8px",border:`1px solid ${B.blue}`,borderRadius:4,fontFamily:"inherit",boxSizing:"border-box"}} autoFocus/>
                        <div style={{display:"flex",gap:6,marginTop:4}}>
                          <button onClick={saveObj} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:"none",background:B.blue,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Save</button>
                          <button onClick={()=>setEditingOverride(null)} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",color:B.t2,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                          {overrides?.[objKey] && <button onClick={()=>{onSetOverride(objKey,null);setEditingOverride(null);}} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",color:"#DC2626",cursor:"pointer",fontFamily:"inherit"}}>Reset to default</button>}
                        </div>
                      </li>;
                    }
                    return <li key={i} style={{fontSize:12,color:B.t1,lineHeight:1.6,marginBottom:4,display:"flex",alignItems:"flex-start",gap:4}}>
                      <span style={{flex:1}}>{objText}</span>
                      {isAdminView && onSetOverride && <button onClick={()=>setEditingOverride({key:objKey,text:objText})} style={{...PENCIL_STYLE,fontSize:11}} onMouseEnter={pencilHoverOn} onMouseLeave={pencilHoverOff} title="Edit objective">✏️</button>}
                    </li>;
                  })}
                </ul>
              </div>
            )}
            {cIt.weeklyRubric && (
              <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:24}}>
                <div style={{padding:"14px 20px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>{"\uD83D\uDCCB"}</span>
                  <span style={{fontSize:13,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:0.8}}>{cIt.weeklyRubric.title}</span>
                </div>
                <div style={{padding:"16px 20px"}}>
                  <p style={{margin:"0 0 16px",fontSize:13,fontStyle:"italic",color:B.t2,lineHeight:1.5}}>{cIt.weeklyRubric.intro}</p>
                  <ol style={{margin:"0 0 16px",paddingLeft:22,fontSize:13,color:B.t1,lineHeight:1.6}}>
                    {cIt.weeklyRubric.categories.map(cat=>{
                      const rcKey = `rubricCat::${cIt.id}::${cat.num}`;
                      const rc = getRubricCategory ? getRubricCategory(cIt.id, cat.num, cat) : cat;
                      if (editingOverride?.key === rcKey) {
                        const saveRc = () => { const n=editingOverride.name.trim(); const d=editingOverride.desc.trim(); if(!n||!d){setEditingOverride(null);return;} if(n===cat.name&&d===cat.desc)onSetOverride(rcKey,null); else onSetOverride(rcKey,{name:n,desc:d}); setEditingOverride(null); };
                        return <li key={cat.num} style={{marginBottom:8}}>
                          <div style={{display:"flex",flexDirection:"column",gap:4}}>
                            <input value={editingOverride.name} onChange={e=>setEditingOverride({...editingOverride,name:e.target.value})} onKeyDown={e=>{if(e.key==="Escape")setEditingOverride(null);}} placeholder="Category name" style={{fontSize:13,fontWeight:700,padding:"4px 8px",border:`1px solid ${B.blue}`,borderRadius:4,fontFamily:"inherit",boxSizing:"border-box"}} autoFocus/>
                            <textarea value={editingOverride.desc} onChange={e=>setEditingOverride({...editingOverride,desc:e.target.value})} onKeyDown={e=>{if(e.key==="Escape")setEditingOverride(null);}} rows={3} placeholder="Description" style={{fontSize:13,padding:"4px 8px",border:`1px solid ${B.blue}`,borderRadius:4,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={saveRc} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:"none",background:B.blue,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Save</button>
                              <button onClick={()=>setEditingOverride(null)} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",color:B.t2,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                              {overrides?.[rcKey] && <button onClick={()=>{onSetOverride(rcKey,null);setEditingOverride(null);}} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",color:"#DC2626",cursor:"pointer",fontFamily:"inherit"}}>Reset to default</button>}
                            </div>
                          </div>
                        </li>;
                      }
                      return <li key={cat.num} style={{marginBottom:8,display:"flex",alignItems:"flex-start",gap:4}}>
                        <span style={{flex:1}}><strong>{rc.name}</strong> — {rc.desc}</span>
                        {isAdminView && onSetOverride && <button onClick={()=>setEditingOverride({key:rcKey,name:rc.name,desc:rc.desc})} style={{...PENCIL_STYLE,fontSize:11}} onMouseEnter={pencilHoverOn} onMouseLeave={pencilHoverOff} title="Edit rubric category">✏️</button>}
                      </li>;
                    })}
                  </ol>
                  <div style={{fontSize:12,color:B.t2,fontStyle:"italic",paddingTop:12,borderTop:`1px solid ${B.bdr}`,marginBottom:12}}>{cIt.weeklyRubric.banding}</div>
                  <a href={cIt.weeklyRubric.fullDocLink} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",padding:"8px 16px",background:B.blue,color:"#fff",textDecoration:"none",borderRadius:7,fontSize:12,fontWeight:600}}>{cIt.weeklyRubric.fullDocLabel} →</a>
                </div>
              </div>
            )}
            {(() => {
              const REAL_WORLD_BODY = cIt.realWorldApplication || "Your manager will share anonymized client examples for both deliverables during the week. One STR scenario for Wednesday's presentation and one REPS scenario for Friday's. Refer to your manager for the Week 2 client packets and walk through them together before each presentation.";
              const rwKey = `realworld::${cIt.id}`;
              const rwBody = getRealWorld ? getRealWorld(cIt.id, REAL_WORLD_BODY) : REAL_WORLD_BODY;
              return <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:24}}>
                <div style={{padding:"14px 20px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>{"\uD83D\uDCA1"}</span>
                  <span style={{fontSize:13,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:0.8}}>Real World Application</span>
                </div>
                <div style={{padding:"16px 20px"}}>
                  {editingOverride?.key === rwKey ? <>
                    <textarea value={editingOverride.body} onChange={e=>setEditingOverride({...editingOverride,body:e.target.value})} onKeyDown={e=>{if(e.key==="Escape")setEditingOverride(null);}} rows={4} style={{width:"100%",fontSize:13,color:B.t1,lineHeight:1.5,padding:"6px 8px",border:`1px solid ${B.blue}`,borderRadius:4,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
                    <div style={{display:"flex",gap:6,marginTop:4}}>
                      <button onClick={()=>{const val=editingOverride.body.trim();if(!val){setEditingOverride(null);return;}if(val===REAL_WORLD_BODY)onSetOverride(rwKey,null);else onSetOverride(rwKey,{body:val});setEditingOverride(null);}} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:"none",background:B.blue,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Save</button>
                      <button onClick={()=>setEditingOverride(null)} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",color:B.t2,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                      {overrides?.[rwKey] && <button onClick={()=>{onSetOverride(rwKey,null);setEditingOverride(null);}} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",color:"#DC2626",cursor:"pointer",fontFamily:"inherit"}}>Reset to default</button>}
                    </div>
                  </> : <div style={{display:"flex",alignItems:"flex-start",gap:4}}>
                    <p style={{margin:0,fontSize:13,color:B.t1,lineHeight:1.5,flex:1}}>{rwBody}</p>
                    {isAdminView && onSetOverride && <button onClick={()=>setEditingOverride({key:rwKey,body:rwBody})} style={{...PENCIL_STYLE,fontSize:11}} onMouseEnter={pencilHoverOn} onMouseLeave={pencilHoverOff} title="Edit real world application">{"\u270F\uFE0F"}</button>}
                  </div>}
                </div>
              </div>;
            })()}
            {cIt.deliverables && cIt.deliverables.length > 0 && (
              <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:24}}>
                <div style={{padding:"14px 20px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>📅</span>
                  <span style={{fontSize:13,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:0.8}}>Deliverables</span>
                </div>
                <div style={{padding:"16px 20px"}}>
                  {cIt.deliverables.map((d,i) => {
                    const dlKey = `deliverable::${cIt.id}::${d.id}`;
                    const dl = getDeliverable ? getDeliverable(cIt.id, d.id, d) : d;
                    if (editingOverride?.key === dlKey) {
                      const saveDl = () => { const val=editingOverride.description.trim(); if(!val){setEditingOverride(null);return;} if(val===d.description)onSetOverride(dlKey,null); else onSetOverride(dlKey,{description:val}); setEditingOverride(null); };
                      return <div key={d.id} style={{paddingBottom:12,marginBottom:12,borderBottom:i < cIt.deliverables.length - 1 ? `1px solid ${B.bdr}` : "none"}}>
                        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12,marginBottom:4}}>
                          <span style={{fontSize:14,fontWeight:700,color:B.navy}}>{d.title}</span>
                          <span style={{fontSize:12,fontWeight:600,color:B.blue,whiteSpace:"nowrap"}}>Due {d.dueDate}</span>
                        </div>
                        <textarea value={editingOverride.description} onChange={e=>setEditingOverride({...editingOverride,description:e.target.value})} onKeyDown={e=>{if(e.key==="Escape")setEditingOverride(null);}} rows={3} style={{width:"100%",fontSize:13,color:B.t1,lineHeight:1.5,padding:"6px 8px",border:`1px solid ${B.blue}`,borderRadius:4,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
                        <div style={{display:"flex",gap:6,marginTop:4}}>
                          <button onClick={saveDl} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:"none",background:B.blue,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Save</button>
                          <button onClick={()=>setEditingOverride(null)} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",color:B.t2,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                          {overrides?.[dlKey] && <button onClick={()=>{onSetOverride(dlKey,null);setEditingOverride(null);}} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",color:"#DC2626",cursor:"pointer",fontFamily:"inherit"}}>Reset to default</button>}
                        </div>
                      </div>;
                    }
                    return <div key={d.id} style={{paddingBottom:12,marginBottom:12,borderBottom:i < cIt.deliverables.length - 1 ? `1px solid ${B.bdr}` : "none"}}>
                      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12,marginBottom:4}}>
                        <span style={{fontSize:14,fontWeight:700,color:B.navy}}>{d.title}</span>
                        <span style={{fontSize:12,fontWeight:600,color:B.blue,whiteSpace:"nowrap"}}>Due {d.dueDate}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"flex-start",gap:4}}>
                        <div style={{fontSize:13,color:B.t1,lineHeight:1.5,flex:1}}>{dl.description}</div>
                        {isAdminView && onSetOverride && <button onClick={()=>setEditingOverride({key:dlKey,description:dl.description})} style={{...PENCIL_STYLE,fontSize:11}} onMouseEnter={pencilHoverOn} onMouseLeave={pencilHoverOff} title="Edit deliverable">✏️</button>}
                      </div>
                    </div>;
                  })}
                  <div style={{fontSize:12,color:B.t2,fontStyle:"italic",marginTop:4}}>Add these as tasks in ClickUp as necessary.</div>
                </div>
              </div>
            )}
            {cIt.tasks && cIt.tasks.length > 0 && (<>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <div style={{flex:1,height:7,borderRadius:4,background:B.blueL,overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,transition:"width .4s",width:`${itemProg(cIt,completedTasks)}%`,background:itemProg(cIt,completedTasks)===100?B.ok:`linear-gradient(90deg,${B.blue},${B.blueD})`}}/></div>
              <span style={{fontSize:12,fontWeight:600,color:itemProg(cIt,completedTasks)===100?B.ok:B.blue,whiteSpace:"nowrap"}}>{cIt.tasks.filter(t=>completedTasks[t.id]).length} / {cIt.tasks.length}</span>
            </div>
            {/* Tasks Card */}
            <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
              <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`}}><span style={{fontSize:12,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Tasks</span></div>
              {cIt.tasks.map((task,idx)=>{
                const done=!!completedTasks[task.id];
                const tKey = `task::${task.id}`;
                const displayText = getTaskText ? getTaskText(task.id, task.text) : task.text;
                const isEditing = editingOverride?.key === tKey;
                const saveTask = () => { const val=editingOverride.text.trim(); if(!val){/* empty = cancel */} else if(val===task.text)onSetOverride(tKey,null); else onSetOverride(tKey,{text:val}); setEditingOverride(null); };
                if (isEditing) return (
                  <div key={task.id} style={{padding:"10px 18px",borderBottom:idx<cIt.tasks.length-1?`1px solid ${B.bdr}`:"none",background:"#fffbeb"}} onClick={e=>e.stopPropagation()}>
                    <input value={editingOverride.text} onChange={e=>setEditingOverride(p=>({...p,text:e.target.value}))} autoFocus style={{width:"100%",fontSize:13,padding:"6px 8px",border:`1px solid ${B.blue}`,borderRadius:6,fontFamily:"inherit",boxSizing:"border-box"}}
                      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();saveTask();}if(e.key==="Escape")setEditingOverride(null);}}/>
                    <div style={{display:"flex",gap:6,marginTop:6}}>
                      <button onClick={saveTask} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:"none",background:B.blue,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Save</button>
                      <button onClick={()=>setEditingOverride(null)} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                      {overrides?.[tKey] && <button onClick={()=>{onSetOverride(tKey,null);setEditingOverride(null);}} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",color:"#DC2626",cursor:"pointer",fontFamily:"inherit"}}>Reset to default</button>}
                    </div>
                  </div>
                );
                return(
                  <div key={task.id} onClick={()=>onToggleTask(task.id)} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 18px",borderBottom:idx<cIt.tasks.length-1?`1px solid ${B.bdr}`:"none",cursor:"pointer",transition:"background .15s",background:done?B.okBg:"transparent"}}
                    onMouseEnter={e=>{if(!done)e.currentTarget.style.background="#fafbfc"}} onMouseLeave={e=>{e.currentTarget.style.background=done?B.okBg:"transparent"}}>
                    <div style={{width:20,height:20,borderRadius:5,flexShrink:0,marginTop:1,border:done?"none":`2px solid ${B.bdr}`,background:done?B.ok:"#fff",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{done&&<Chk/>}</div>
                    <span style={{fontSize:13,lineHeight:1.5,color:done?B.t3:B.t1,textDecoration:done?"line-through":"none",transition:"color .2s",flex:1}}>{displayText}</span>
                    {isAdminView && onSetOverride && <button onClick={e=>{e.stopPropagation();setEditingOverride({key:tKey,text:displayText});}} style={PENCIL_STYLE} onMouseEnter={pencilHoverOn} onMouseLeave={pencilHoverOff} title="Edit task text">✏️</button>}
                  </div>
                );
              })}
            </div>
            </>)}
            {/* Resources */}
            {cIt.resources?.length>0&&(
              <div style={{background:B.card,border:`1px solid ${B.bdr}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:20}}>
                <div style={{padding:"12px 18px",borderBottom:`1px solid ${B.bdr}`,display:"flex",alignItems:"center",gap:6}}><BookIc/><span style={{fontSize:12,fontWeight:700,color:B.navy,textTransform:"uppercase",letterSpacing:.8}}>Resources</span></div>
                <div style={{padding:"10px 18px",display:"flex",flexWrap:"wrap",gap:8}}>
                  {cIt.resources.map((rawR,i)=>{
                    const r = getResource ? getResource(cIt.id, i, rawR) : rawR;
                    const rKey = `resource::${cIt.id}::${i}`;
                    const isEditing = editingOverride?.key === rKey;
                    const saveResource = () => { const lbl=editingOverride.label.trim(); if(!lbl){setEditingOverride(null);return;} const urlVal=editingOverride.url.trim()||null; if(lbl===rawR.label && urlVal===rawR.url) onSetOverride(rKey,null); else onSetOverride(rKey,{label:lbl,url:urlVal}); setEditingOverride(null); };
                    if (isEditing) return (
                      <div key={i} style={{width:"100%",background:"#fffbeb",borderRadius:8,border:`1px solid ${B.blue}`,padding:"10px 12px"}} onClick={e=>e.stopPropagation()}>
                        <div style={{display:"flex",gap:8,marginBottom:6}}>
                          <label style={{fontSize:11,color:B.t3,width:40,paddingTop:6}}>Title</label>
                          <input value={editingOverride.label} onChange={e=>setEditingOverride(p=>({...p,label:e.target.value}))} autoFocus style={{flex:1,fontSize:13,padding:"5px 8px",border:`1px solid ${B.bdr}`,borderRadius:6,fontFamily:"inherit"}}/>
                        </div>
                        <div style={{display:"flex",gap:8,marginBottom:8}}>
                          <label style={{fontSize:11,color:B.t3,width:40,paddingTop:6}}>URL</label>
                          <input value={editingOverride.url||""} onChange={e=>setEditingOverride(p=>({...p,url:e.target.value}))} placeholder="Leave empty for no link" style={{flex:1,fontSize:13,padding:"5px 8px",border:`1px solid ${B.bdr}`,borderRadius:6,fontFamily:"inherit"}}/>
                        </div>
                        <div style={{display:"flex",gap:6,marginLeft:48}}>
                          <button onClick={saveResource} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:"none",background:B.blue,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Save</button>
                          <button onClick={()=>setEditingOverride(null)} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                          {overrides?.[rKey] && <button onClick={()=>{onSetOverride(rKey,null);setEditingOverride(null);}} style={{fontSize:11,padding:"3px 10px",borderRadius:4,border:`1px solid ${B.bdr}`,background:"#fff",color:"#DC2626",cursor:"pointer",fontFamily:"inherit"}}>Reset to default</button>}
                        </div>
                      </div>
                    );
                    const lbl = (r.label||"").toLowerCase();
                    const typeIcon = r.type === "pdf" || lbl.includes("pdf") || lbl.includes("handbook") || lbl.includes("checklist") || lbl.includes("guide") || lbl.includes("template") || lbl.includes("overview") ? "\uD83D\uDCC4" : r.type === "video" || lbl.includes("video") ? "\uD83D\uDCF9" : "\uD83D\uDD17";
                    const typeLabel = typeIcon === "\uD83D\uDCC4" ? "PDF Document" : typeIcon === "\uD83D\uDCF9" ? "Video" : "Link";
                    const hasUrl = r.url != null;
                    const pill = <span key={i} title={`${r.label} (${typeLabel})${hasUrl ? "" : " — pending"}`} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"10px 14px",minHeight:44,borderRadius:22,fontSize:13,fontWeight:500,background:hasUrl ? B.blueL : "#f1f5f9",color:hasUrl ? B.blue : B.t3,border:`1px solid ${hasUrl ? B.blueM : B.bdr}`,cursor:hasUrl ? "pointer" : "default",boxSizing:"border-box",transition:"background .15s",opacity:hasUrl ? 1 : 0.7}}
                      onMouseEnter={e=>{if(hasUrl)e.currentTarget.style.background="#dbeafe"}} onMouseLeave={e=>{if(hasUrl)e.currentTarget.style.background=hasUrl?B.blueL:"#f1f5f9"}}>
                      <span style={{fontSize:15}}>{typeIcon}</span>{r.label}{!hasUrl && <span style={{fontSize:9,fontWeight:700,color:B.t3,background:"#e2e8f0",padding:"1px 6px",borderRadius:4,marginLeft:4}}>pending</span>}
                      {isAdminView && onSetOverride && <span onClick={e=>{e.preventDefault();e.stopPropagation();setEditingOverride({key:rKey,label:r.label,url:r.url||""});}} style={{...PENCIL_STYLE,marginLeft:4,fontSize:11}} onMouseEnter={pencilHoverOn} onMouseLeave={pencilHoverOff} title="Edit resource">✏️</span>}
                    </span>;
                    if (hasUrl) return <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>{pill}</a>;
                    return pill;
                  })}
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
            {/* Assessment / Quiz */}
            {(cIt.assessment?.length > 0 || cIt.quiz) && (
              <AssessmentModule
                key={cIt.id}
                blocks={cIt.assessment?.length > 0 ? cIt.assessment : migrateLegacyQuiz(cIt)}
                sectionId={cIt.id}
                userId={user.id}
                isAdminView={isAdminView}
                sectionTopicTags={cIt.topicTags || (cIt.assessment || []).flatMap(b => b.topicTags || [])}
                onModuleComplete={(result) => {
                  // Bridge to existing quiz result system for section completion gating
                  onPassQuiz(cIt.id, { passed: result.passed, questions: {}, moduleScore: result.moduleScore, needsAdminReview: result.needsAdminReview });
                }}
              />
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
  const dataLoaded = useRef(false);

  useEffect(()=>{ (async()=>{ try{ const d=await storage.get("aiola-portal-v2"); if(d){ const p=JSON.parse(d.value); setAllUserData(prev=>{const m={...prev};for(const uid in p){m[uid]={tasks:{...(prev[uid]?.tasks||{}),...(p[uid]?.tasks||{})},quizzes:{...(prev[uid]?.quizzes||{}),...(p[uid]?.quizzes||{})}}}return m}); }}catch{} dataLoaded.current = true; })(); },[]);
  useEffect(()=>{ if (!dataLoaded.current) return; (async()=>{ try{await storage.set("aiola-portal-v2",JSON.stringify(allUserData))}catch{}})(); },[allUserData]);

  const handleLogin = u => { setCurrentUser(u); setView(u.role==="admin"?"admin":u.role==="client"?"client":"trainee"); };
  const handleLogout = () => { setCurrentUser(null); setView("login"); setViewingTrainee(null); };
  const toggleTask = uid => tid => setAllUserData(p=>({...p,[uid]:{tasks:{...(p[uid]?.tasks||{}),[tid]:!(p[uid]?.tasks?.[tid])},quizzes:p[uid]?.quizzes||{}}}));
  const passQuiz = uid => (iid, result) => {
    // result can be: undefined (legacy single-question pass) or {passed, questions}
    const val = result || true;
    setAllUserData(p=>({...p,[uid]:{tasks:p[uid]?.tasks||{},quizzes:{...(p[uid]?.quizzes||{}),[iid]:val}}}));
  };
  const [kpiData, setKpiData] = useState({});
  const [notesData, setNotesData] = useState({});
  const [scorecardData, setScorecardData] = useState({});
  // Content overrides for task text and resource title/URL (admin edits).
  // Keys: "task::<taskId>" → { text }, "resource::<itemId>::<index>" → { label, url }
  const [overrides, setOverrides] = useState({});

  // Load KPI, notes/badges, and scorecard data from storage (or seed on first load)
  useEffect(()=>{ (async()=>{
    // KPI
    try {
      const sk = await storage.get("aiola-kpi-v1");
      if (sk?.value) { setKpiData(JSON.parse(sk.value)); }
      else { await storage.set("aiola-kpi-v1", JSON.stringify(KPI_SEED_DATA)); setKpiData({...KPI_SEED_DATA}); }
    } catch { setKpiData({...KPI_SEED_DATA}); }
    // Notes & Badges
    try {
      const sn = await storage.get("aiola-notes-v1");
      if (sn?.value) { setNotesData(JSON.parse(sn.value)); }
      else { await storage.set("aiola-notes-v1", JSON.stringify(NOTES_SEED_DATA)); setNotesData({...NOTES_SEED_DATA}); }
    } catch { setNotesData({...NOTES_SEED_DATA}); }
    // Scorecards — load from Supabase deliverable_scores table
    try {
      const userIds = MOCK_TRAINEES.map(t => t.id);
      const allScorecardsByUser = {};
      for (const uid of userIds) {
        const rows = await scorecards.listForTrainee(uid);
        allScorecardsByUser[uid] = rows.map(row => {
          const { total, band } = computeScorecard(row.scores || {});
          const trainee = MOCK_TRAINEES.find(t => t.id === uid);
          const phase = inferScorecardPhase(daysSince(trainee?.startDate || new Date().toISOString().slice(0,10)));
          return {
            id: row.id,
            weekItemId: row.item_id,
            deliverableId: row.deliverable_id,
            scores: row.scores,
            total: row.total ?? total,
            band,
            phase,
            overallNotes: row.notes || "",
            submittedBy: row.scored_by || "",
            date: row.scored_at,
          };
        });
      }
      setScorecardData(allScorecardsByUser);
    } catch (e) {
      console.warn('Failed to load scorecards from Supabase', e);
      setScorecardData({});
    }
    // Content overrides
    try {
      const so = await storage.get("aiola-overrides-v1");
      if (so?.value) { setOverrides(JSON.parse(so.value)); }
    } catch {}
    dataLoaded.current = true;
  })(); },[]);

  // Persist KPI data on change
  useEffect(()=>{ if (!dataLoaded.current) return; if(Object.keys(kpiData).length===0)return; (async()=>{ try{await storage.set("aiola-kpi-v1",JSON.stringify(kpiData))}catch{}})(); },[kpiData]);
  // Persist notes/badges data on change
  useEffect(()=>{ if (!dataLoaded.current) return; if(Object.keys(notesData).length===0)return; (async()=>{ try{await storage.set("aiola-notes-v1",JSON.stringify(notesData))}catch{}})(); },[notesData]);
  // Persist content overrides on change
  useEffect(()=>{ if (!dataLoaded.current) return; if(Object.keys(overrides).length===0)return; (async()=>{ try{await storage.set("aiola-overrides-v1",JSON.stringify(overrides))}catch{}})(); },[overrides]);

  const [landOnPerf, setLandOnPerf] = useState(false);
  const viewTrainee = t => { setViewingTrainee(t); setLandOnPerf(false); setView("trainee-admin"); };
  const viewTraineePerf = t => { setViewingTrainee(t); setLandOnPerf(true); setView("trainee-admin"); };
  const addKpiScore = (uid, kpiId, entry) => {
    setKpiData(prev => ({...prev, [uid]: {...(prev[uid]||{}), [kpiId]: [...((prev[uid]||{})[kpiId]||[]), entry]}}));
  };
  const addScorecard = async (uid, entry) => {
    const row = await scorecards.upsert({
      trainee_user_id: uid,
      item_id: entry.weekItemId,
      deliverable_id: entry.deliverableId,
      scores: entry.scores,
      total: entry.total,
      max_total: 20,
      notes: entry.overallNotes || null,
      scored_by: entry.submittedBy || null,
    });
    if (row) {
      const mapped = {
        id: row.id,
        weekItemId: row.item_id,
        deliverableId: row.deliverable_id,
        scores: row.scores,
        total: row.total,
        overallNotes: row.notes || "",
        submittedBy: row.scored_by || "",
        date: row.scored_at,
        band: entry.band,
        phase: entry.phase,
      };
      setScorecardData(prev => {
        const userList = prev[uid] || [];
        const filtered = userList.filter(e => !(e.weekItemId === mapped.weekItemId && e.deliverableId === mapped.deliverableId));
        return {...prev, [uid]: [...filtered, mapped]};
      });
    } else {
      console.warn('scorecards.upsert failed for', uid, entry.deliverableId);
    }
  };
  const addNote = (uid, note) => {
    const trainee = MOCK_TRAINEES.find(t => t.id === uid);
    const phase = inferScorecardPhase(daysSince(trainee?.startDate || new Date().toISOString().slice(0,10)));
    const noteWithPhase = { ...note, phase: note.phase || phase };
    setNotesData(prev => ({...prev, [uid]: {...(prev[uid]||{notes:[],badges:[]}), notes: [...((prev[uid]||{}).notes||[]), noteWithPhase]}}));
  };
  const addBadge = (uid, badge) => {
    const trainee = MOCK_TRAINEES.find(t => t.id === uid);
    const phase = inferScorecardPhase(daysSince(trainee?.startDate || new Date().toISOString().slice(0,10)));
    const badgeWithPhase = { ...badge, phase: badge.phase || phase };
    setNotesData(prev => ({...prev, [uid]: {...(prev[uid]||{notes:[],badges:[]}), badges: [...((prev[uid]||{}).badges||[]), badgeWithPhase]}}));
  };
  const updateBadge = (uid, badgeId, updates) => {
    setNotesData(prev => {
      const d = prev[uid] || { notes: [], badges: [] };
      return {...prev, [uid]: {...d, badges: (d.badges||[]).map(b => b.id === badgeId ? {...b, ...updates} : b)}};
    });
  };

  // Override getters — merge admin edits onto source data
  const getTaskText = (taskId, sourceText) => overrides[`task::${taskId}`]?.text ?? sourceText;
  const getResource = (itemId, index, original) => {
    const o = overrides[`resource::${itemId}::${index}`];
    if (!o) return original;
    return { ...original, label: o.label ?? original.label, url: o.url !== undefined ? o.url : original.url };
  };
  const getItemDescription = (itemId, sourceText) => overrides[`description::${itemId}`]?.text ?? sourceText;
  const getObjective = (itemId, idx, sourceText) => overrides[`objective::${itemId}::${idx}`]?.text ?? sourceText;
  const getRubricCategory = (itemId, catNum, sourceCat) => {
    const ov = overrides[`rubricCat::${itemId}::${catNum}`];
    if (!ov) return sourceCat;
    return { ...sourceCat, name: ov.name ?? sourceCat.name, desc: ov.desc ?? sourceCat.desc };
  };
  const getDeliverable = (itemId, delivId, sourceDeliv) => {
    const ov = overrides[`deliverable::${itemId}::${delivId}`];
    if (!ov) return sourceDeliv;
    return { ...sourceDeliv, description: ov.description ?? sourceDeliv.description };
  };
  const getRealWorld = (itemId, sourceBody) =>
    overrides[`realworld::${itemId}`]?.body ?? sourceBody;
  const setOverride = (key, value) => setOverrides(prev => {
    if (value == null) { const next = {...prev}; delete next[key]; return next; }
    return {...prev, [key]: value};
  });

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
    generateMilestoneReport(t, allUserData[uid], kpiData[uid] || {}, nd, scorecardData[uid] || [], { dateFrom, dateTo, isTraineeReport: reportModal.isTraineeReport });
    setReportModal(null);
  };

  let content = null;
  if(view==="login") content = <LoginScreen onLogin={handleLogin}/>;
  else if(view==="admin") content = <AdminDashboard user={currentUser} allData={allUserData} onViewTrainee={viewTrainee} onViewPerformance={viewTraineePerf} onGenerateReport={handleGenerateReport} onLogout={handleLogout} kpiData={kpiData}/>;
  else if(view==="trainee-admin"&&viewingTrainee){ const uid=viewingTrainee.id; const nd=notesData[uid]||{notes:[],badges:[]}; content = <TraineePortal user={viewingTrainee} completedTasks={allUserData[uid]?.tasks||{}} quizResults={allUserData[uid]?.quizzes||{}} onToggleTask={toggleTask(uid)} onPassQuiz={passQuiz(uid)} onLogout={handleLogout} isAdminView={true} onBackToAdmin={()=>setView("admin")} onGenerateReport={()=>handleGenerateReport(viewingTrainee)} notes={nd.notes} badges={nd.badges} onAddNote={addNote} onAddBadge={addBadge} onUpdateBadge={updateBadge} kpiData={kpiData[uid]||{}} scorecards={scorecardData[uid]||[]} onAddScorecard={addScorecard} onAddKpiScore={addKpiScore} initialPerfPage={landOnPerf} getTaskText={getTaskText} getResource={getResource} getItemDescription={getItemDescription} getObjective={getObjective} getRubricCategory={getRubricCategory} getDeliverable={getDeliverable} getRealWorld={getRealWorld} onSetOverride={setOverride} overrides={overrides}/>; }
  else if(view==="trainee"&&currentUser){ const uid=currentUser.id; const nd=notesData[uid]||{notes:[],badges:[]}; content = <TraineePortal user={currentUser} completedTasks={allUserData[uid]?.tasks||{}} quizResults={allUserData[uid]?.quizzes||{}} onToggleTask={toggleTask(uid)} onPassQuiz={passQuiz(uid)} onLogout={handleLogout} isAdminView={false} onBackToAdmin={null} notes={nd.notes} badges={nd.badges} kpiData={kpiData[uid]||{}} onGenerateReport={()=>handleTraineeReport(currentUser)} scorecards={scorecardData[uid]||[]} getTaskText={getTaskText} getResource={getResource} getItemDescription={getItemDescription} getObjective={getObjective} getRubricCategory={getRubricCategory} getDeliverable={getDeliverable} getRealWorld={getRealWorld} overrides={overrides}/>; }
  else if(view==="client"&&currentUser) content = <ClientPortalShell user={currentUser} onLogout={handleLogout}/>;

  return <>
    <style>{RESPONSIVE_CSS}</style>
    {content}
    {reportModal && <ReportDateModal title={reportModal.isTraineeReport ? "Generate My Progress Report" : "Generate Milestone Report"} startDate={reportModal.trainee.startDate} onGenerate={executeReport} onClose={()=>setReportModal(null)}/>}
  </>;
}
