// ─── Canonical Topic Taxonomy ────────────────────────────────────────────────
// Each topic has: id (snake_case), label (human-readable), category, description.
// Firm-specific descriptions are marked TODO_NICK for Nick to fill in.

export const TOPIC_TAGS = [
  // ── Tax Foundations ──
  { id: "form_1040", label: "Form 1040", category: "Tax Foundations", description: "Individual income tax return structure, line items, and filing requirements." },
  { id: "schedule_a", label: "Schedule A", category: "Tax Foundations", description: "Itemized deductions including medical, state/local taxes, mortgage interest, and charitable." },
  { id: "schedule_b", label: "Schedule B", category: "Tax Foundations", description: "Interest and ordinary dividend income reporting." },
  { id: "schedule_c", label: "Schedule C", category: "Tax Foundations", description: "Sole proprietorship profit or loss, business income and expenses." },
  { id: "schedule_d", label: "Schedule D", category: "Tax Foundations", description: "Capital gains and losses from investment sales." },
  { id: "schedule_e", label: "Schedule E", category: "Tax Foundations", description: "Supplemental income from rental real estate, royalties, partnerships, and S-Corps." },
  { id: "qbi", label: "QBI Deduction", category: "Tax Foundations", description: "Section 199A qualified business income deduction for pass-through entities." },
  { id: "se_tax", label: "Self-Employment Tax", category: "Tax Foundations", description: "Social Security and Medicare taxes on self-employment income." },
  { id: "amt", label: "AMT", category: "Tax Foundations", description: "Alternative Minimum Tax calculation and common triggers." },
  { id: "niit", label: "NIIT", category: "Tax Foundations", description: "Net Investment Income Tax (3.8%) on high earners." },
  { id: "depreciation", label: "Depreciation", category: "Tax Foundations", description: "MACRS depreciation methods, useful lives, and conventions." },
  { id: "basis", label: "Basis Tracking", category: "Tax Foundations", description: "Cost basis, adjusted basis, and basis limitations for loss deductions." },
  { id: "quarterly_estimates", label: "Quarterly Estimated Tax", category: "Tax Foundations", description: "Form 1040-ES, safe harbor rules under §6654, withholding interaction, annualized income method." },

  // ── Entity & Strategy ──
  { id: "s_corp", label: "S-Corporation", category: "Entity & Strategy", description: "S-Corp election, requirements, shareholder limitations, and tax treatment." },
  { id: "llc", label: "LLC Structure", category: "Entity & Strategy", description: "LLC formation, operating agreements, and default tax classification." },
  { id: "reasonable_comp", label: "Reasonable Compensation", category: "Entity & Strategy", description: "S-Corp officer salary requirements and IRS audit risk factors." },
  { id: "pass_through", label: "Pass-Through Taxation", category: "Entity & Strategy", description: "How income flows through to individual returns for S-Corps, partnerships, and LLCs." },
  { id: "entity_election", label: "Entity Election", category: "Entity & Strategy", description: "Choosing between sole prop, LLC, S-Corp, and C-Corp based on client situation." },
  { id: "partnership_taxation", label: "Partnership Taxation", category: "Entity & Strategy", description: "Partnership tax return (Form 1065), K-1 distribution, and partner basis." },

  // ── Real Estate Core ──
  { id: "rental_classification", label: "Rental Classification", category: "Real Estate Core", description: "Distinguishing rental activity types: long-term, short-term, and self-rental." },
  { id: "passive_loss", label: "Passive Loss Rules", category: "Real Estate Core", description: "IRC Section 469 passive activity loss limitations and exceptions." },
  { id: "suspended_losses", label: "Suspended Losses", category: "Real Estate Core", description: "Tracking and releasing passive losses suspended by PAL rules." },
  { id: "special_25k_allowance", label: "$25K Allowance", category: "Real Estate Core", description: "Special $25,000 rental loss allowance for active participants under $150K MAGI." },
  { id: "recapture", label: "Depreciation Recapture", category: "Real Estate Core", description: "Section 1250 unrecaptured gain taxed at 25% on sale of rental property." },
  { id: "section_1031", label: "1031 Exchange", category: "Real Estate Core", description: "Like-kind exchange rules, timelines, and qualified intermediary requirements." },
  { id: "section_121", label: "Section 121 Exclusion", category: "Real Estate Core", description: "Primary residence gain exclusion ($250K/$500K) and ownership/use tests." },

  // ── STR Strategy ──
  { id: "str_loophole", label: "STR Loophole", category: "STR Strategy", description: "Short-term rental exception to passive activity rules under IRC 469." },
  { id: "avg_stay_test", label: "Average Stay Test", category: "STR Strategy", description: "7-day average guest stay requirement for STR non-passive treatment." },
  { id: "substantial_services", label: "Substantial Services", category: "STR Strategy", description: "When hotel-like services reclassify rental income to Schedule C." },
  { id: "schedule_e_vs_c", label: "Schedule E vs C", category: "STR Strategy", description: "Determining correct schedule for STR income based on services provided." },

  // ── Material Participation ──
  { id: "material_participation_tests", label: "MP Tests Overview", category: "Material Participation", description: "Seven material participation tests under IRC 469 and Reg 1.469-5T." },
  { id: "mp_500hr", label: "500-Hour Test", category: "Material Participation", description: "Material participation via 500+ hours in the activity during the year." },
  { id: "mp_100hr_more_than_anyone", label: "100hr + More Than Anyone", category: "Material Participation", description: "100+ hours AND more than any other individual in the activity." },
  { id: "mp_aggregation", label: "MP Aggregation", category: "Material Participation", description: "Grouping multiple activities to meet material participation tests." },

  // ── REPS ──
  { id: "reps_750hr", label: "REPS 750-Hour Test", category: "REPS", description: "Real Estate Professional Status requirement of 750+ hours in real property trades or businesses." },
  { id: "reps_50pct_test", label: "REPS 50% Test", category: "REPS", description: "More than 50% of personal services must be in real property trades or businesses." },
  { id: "reps_aggregation_election", label: "REPS Aggregation", category: "REPS", description: "Election to aggregate all rental activities as a single activity for MP purposes." },
  { id: "w2_real_estate_employee", label: "W-2 RE Employee", category: "REPS", description: "How W-2 real estate employees can qualify for REPS and implications." },

  // ── Cost Segregation ──
  { id: "cost_seg_basics", label: "Cost Seg Basics", category: "Cost Segregation", description: "Cost segregation study process, benefits, and when to recommend one." },
  { id: "bonus_depreciation", label: "Bonus Depreciation", category: "Cost Segregation", description: "100% bonus depreciation phase-down schedule and qualifying property." },
  { id: "sec_179", label: "Section 179", category: "Cost Segregation", description: "Section 179 expensing election limits, qualifying property, and income limitations." },
  { id: "partial_dispositions", label: "Partial Dispositions", category: "Cost Segregation", description: "Disposing of building components to accelerate deductions on improvements." },

  // ── Advisory Process ──
  { id: "ism_structure", label: "ISM Structure", category: "Advisory Process", description: "TODO_NICK — Aiola's Initial Strategy Meeting flow and key sections." },
  { id: "tsr_build", label: "TSR Build", category: "Advisory Process", description: "TODO_NICK — How to build a Tax Strategy Roadmap document." },
  { id: "tsr_delivery", label: "TSR Delivery", category: "Advisory Process", description: "TODO_NICK — Best practices for presenting and delivering the TSR to clients." },
  { id: "checkup_cadence", label: "Checkup Cadence", category: "Advisory Process", description: "TODO_NICK — Quarterly checkup call scheduling and agenda framework." },
  { id: "time_log_review", label: "Time Log Review", category: "Advisory Process", description: "TODO_NICK — Reviewing client time logs for material participation compliance." },
  { id: "client_escalation", label: "Client Escalation", category: "Advisory Process", description: "TODO_NICK — When and how to escalate client issues to Nick." },
  { id: "advisory_vs_prep", label: "Advisory vs Prep", category: "Advisory Process", description: "TODO_NICK — Key differences between advisory and tax prep engagements at Aiola." },

  // ── Operations ──
  { id: "clickup_workflow", label: "ClickUp Workflow", category: "Operations", description: "TODO_NICK — Aiola's ClickUp task management conventions and status flows." },
  { id: "front_protocol", label: "Front Protocol", category: "Operations", description: "TODO_NICK — Shared inbox etiquette and assignment rules in Front." },
  { id: "aiola_culture", label: "Aiola Culture", category: "Operations", description: "TODO_NICK — Firm values, team norms, and cultural expectations." },
  { id: "kpi_tracking", label: "KPI Tracking", category: "Operations", description: "TODO_NICK — How KPIs are measured and what benchmarks to hit." },
  { id: "security", label: "Security", category: "Operations", description: "Password policies, MFA requirements, and data handling procedures for CPA firms." },
  { id: "onboarding", label: "Onboarding", category: "Operations", description: "Day 1 setup procedures, system access, and orientation checklist." },
];

const tagMap = new Map(TOPIC_TAGS.map(t => [t.id, t]));

export function getTagById(id) {
  return tagMap.get(id) || null;
}

export function getTagsByCategory(category) {
  return TOPIC_TAGS.filter(t => t.category === category);
}

export function validateTag(id) {
  return tagMap.has(id);
}

export const CATEGORIES = [...new Set(TOPIC_TAGS.map(t => t.category))];
