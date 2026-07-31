import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { ResumeContent } from "../src/lib/schemas";

/**
 * Seeded from Manan Basheri's real resumes (Finance and Product Manager
 * versions) so tailoring and scoring run against genuine ground truth from the
 * first launch. Claude is instructed never to invent experience beyond what
 * lives here — keep this content accurate.
 *
 * Run with: npx prisma db seed
 */

const contact = {
  name: "Manan Basheri",
  email: "mbasheri@uwaterloo.ca",
  phone: "416.799.5271",
  location: "Toronto, ON, Canada",
  linkedin: "linkedin.com/in/mananbasheri",
  website: "",
};

/* -------------------------------------------------------------------------- */
/* FP&A / Finance resume                                                      */
/* -------------------------------------------------------------------------- */

const financeResume: ResumeContent = {
  contact: { ...contact },
  summary: "",
  experience: [
    {
      company: "Brookfield Asset Management",
      title: "Valuations Analyst Intern",
      location: "Toronto, ON",
      startDate: "Jan 2026",
      endDate: "May 2026",
      bullets: [
        "Built and maintained DCF models covering a $200 billion global infrastructure portfolio, feeding in FX and interest rate data from Bloomberg to keep valuations current for quarterly reviews.",
        "Ran scenario and sensitivity analyses on NOI, IRR, and MOIC to size upside and downside cases, and presented findings to senior stakeholders supporting capital allocation and fundraising decisions.",
      ],
    },
    {
      company: "Brookfield Asset Management",
      title: "Financial Planning & Analysis (FP&A) Intern",
      location: "Toronto, ON",
      startDate: "Sep 2025",
      endDate: "Dec 2025",
      bullets: [
        "Modelled liquidity, revenue, and EBITDA forecasts in Excel for quarterly planning, and prepared inputs for earnings materials reviewed in leadership and investor discussions.",
        "Consolidated and reconciled AUM, EBITDA, and Capex across business units for monthly management reporting and MD&A disclosure, clearing variances before packages went for review.",
      ],
    },
    {
      company: "QuadReal Property Group",
      title: "Data Analyst Intern",
      location: "Toronto, ON",
      startDate: "Jan 2025",
      endDate: "Apr 2025",
      bullets: [
        "Built Power BI dashboards tracking performance across a $59 billion real estate portfolio and integrated macroeconomic indicators, surfacing regional risks and improving the accuracy of deal evaluations.",
        "Automated recurring Excel reporting with VBA, cutting roughly 10 hours of manual work each week and speeding up distribution of investor reports.",
        "Queried the firm's property database with SQL to pull and structure property-level financials, forming the data layer behind the Power BI dashboards.",
        "Reached the finals of a firm-wide case competition, building the financial model and presenting an office development strategy to senior management.",
      ],
    },
    {
      company: "RSM",
      title: "Audit Intern",
      location: "Toronto, ON",
      startDate: "Jan 2024",
      endDate: "Apr 2024",
      bullets: [
        "Reconciled general ledger accounts and tested P&L balances for financial services clients under IFRS, resolving discrepancies ahead of period close.",
        "Assessed client internal controls, recommended remediation steps, and built reusable Excel testing templates that cut documentation time for the engagement team through busy season.",
      ],
    },
  ],
  extracurricular: [
    {
      organization: "University of Waterloo",
      role: "Course Assistant",
      startDate: "Jan 2024",
      endDate: "Present",
      bullets: [
        "Marking assignments, exams, and class participation for undergraduate business courses, applying grading rubrics consistently across large sections.",
      ],
    },
    {
      organization: "Waterloo Real Estate Association",
      role: "Market Research Analyst",
      startDate: "May 2025",
      endDate: "Aug 2025",
      bullets: [
        "Researched Canadian commercial real estate trends including cap rates and rent growth, and built Excel models using NOI, IRR, and sensitivity analysis to evaluate acquisition opportunities.",
      ],
    },
    {
      organization: "Accounting and Finance Orientation Week (AFOW)",
      role: "Orientation Leader",
      startDate: "Aug 2023",
      endDate: "Sep 2023",
      bullets: [
        "Onboarded incoming first-year students as a group leader, running orientation activities and answering questions about the program and campus.",
      ],
    },
    {
      organization: "Accounting and Finance Student Association (AFSA)",
      role: "Project Manager",
      startDate: "Sep 2022",
      endDate: "Apr 2023",
      bullets: [
        "Led professional development events for undergraduate students end to end, covering networking fundamentals and Excel skills, and coordinated timelines, speakers, and volunteers across 6 events.",
      ],
    },
  ],
  skills: [
    {
      category: "Technical",
      items: [
        "Advanced Excel (financial modelling, DCF, pivot tables, INDEX/MATCH, Power Query, VBA)",
        "Power BI",
        "SQL",
        "Python",
        "Bloomberg",
        "Capital IQ",
      ],
    },
    {
      category: "Finance",
      items: [
        "Forecasting",
        "Budgeting support",
        "Variance analysis",
        "Scenario and sensitivity analysis",
        "Management reporting",
        "Valuation",
      ],
    },
    {
      category: "Languages",
      items: [
        "Fluent in English, Hindi, Urdu, and Gujarati",
        "Basic French",
      ],
    },
    {
      category: "Interests",
      items: ["History and philosophy books", "Soccer", "Basketball", "Muay Thai"],
    },
  ],
  education: [
    {
      institution: "University of Waterloo",
      degree: "Master of Accounting (MAcc) — CPA Canada CFE candidate",
      location: "Waterloo, ON",
      startDate: "Jan 2027",
      endDate: "Sep 2027",
      details: [],
    },
    {
      institution: "University of Waterloo",
      degree: "Bachelor of Accounting and Financial Management",
      location: "Waterloo, ON",
      startDate: "",
      endDate: "Expected Dec 2026",
      details: [
        "Cumulative GPA: 3.7 / 4.0 | University of Waterloo President's Scholarship of Distinction ($2,000)",
        "Relevant Coursework: Corporate Finance, Intermediate Financial Accounting, Complex Financial Instruments, Quantitative Foundations for Finance, Predictive Analytics, Analytic Methods for Business",
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Product Manager resume                                                     */
/* -------------------------------------------------------------------------- */

const pmResume: ResumeContent = {
  contact: { ...contact, website: "github.com/mbasheri" },
  summary: "",
  experience: [
    {
      company: "Plateau·Dx — Strength Plateau Diagnosis (plateau-dx.onrender.com)",
      title: "Sole Product Owner — concept, scope, and shipped release",
      location: "",
      startDate: "2026",
      endDate: "",
      bullets: [
        "Noticed that lifting trackers show your data but never explain it, leaving users to figure out a stalled lift on their own. Built the product around explaining, not just tracking.",
        "Scoped v1 down to three steps — spot the stall, explain the likely cause, show the evidence — and cut nutrition tracking, cardio, and social features to keep the product focused.",
        "Chose simple, checkable rules over a black-box model so users could see why the app reached a verdict, and defined the core tradeoff: how sure it should be before speaking up, since being too quick erodes trust and being too slow makes it just another logbook.",
        "Directed AI-assisted development to build the app, focusing personal effort on problem scoping, decision logic, and threshold tuning.",
      ],
    },
    {
      company: "Brookfield Asset Management",
      title: "Valuations Analyst Intern",
      location: "Toronto, ON",
      startDate: "Jan 2026",
      endDate: "May 2026",
      bullets: [
        "Ran scenario and sensitivity analyses to frame upside and downside cases, and presented the resulting recommendations to senior stakeholders supporting capital allocation decisions.",
        "Built and maintained valuation models across a $200 billion global infrastructure portfolio, turning market data into decision-ready inputs for quarterly reviews.",
      ],
    },
    {
      company: "Brookfield Asset Management",
      title: "Financial Planning & Analysis (FP&A) Intern",
      location: "Toronto, ON",
      startDate: "Sep 2025",
      endDate: "Dec 2025",
      bullets: [
        "Coordinated across business units to consolidate and reconcile monthly reporting, resolving conflicting figures before packages reached leadership review.",
        "Modelled liquidity, revenue, and EBITDA forecasts for quarterly planning, and prepared inputs used in earnings materials reviewed by leadership and investors.",
      ],
    },
    {
      company: "QuadReal Property Group",
      title: "Data Analyst Intern",
      location: "Toronto, ON",
      startDate: "Jan 2025",
      endDate: "Apr 2025",
      bullets: [
        "Ran discovery sessions with the investment team to understand how they made regional risk decisions, then scoped which metrics would actually move those decisions versus which ones were just noise.",
        "Owned the build of the resulting Power BI dashboard suite for a $59 billion portfolio, making the tradeoff calls on what to include so the team got signal, not just more data.",
        "Noticed a manual step in the monthly reporting workflow was quietly costing the team hours every week, and made the case to fix it even though it wasn't part of the original scope.",
        "Automated the fix with VBA, saving roughly 10 hours weekly and speeding up the time between data close and investor-facing reports going out.",
      ],
    },
    {
      company: "RSM",
      title: "Audit Intern",
      location: "Toronto, ON",
      startDate: "Jan 2024",
      endDate: "Apr 2024",
      bullets: [
        "Worked directly with client finance teams to reconcile accounts and clear outstanding items, and built reusable Excel templates that cut documentation time for the engagement team.",
      ],
    },
  ],
  extracurricular: [
    {
      organization: "Accounting and Finance Student Association (AFSA)",
      role: "Project Manager",
      startDate: "Sep 2022",
      endDate: "Apr 2023",
      bullets: [
        "Owned professional development events end to end for undergraduate students, scoping each event's format and coordinating timelines, speakers, and volunteers across 6 deliveries.",
      ],
    },
    {
      organization: "University of Waterloo",
      role: "Course Assistant",
      startDate: "Jan 2024",
      endDate: "Present",
      bullets: [
        "Partnered with the professor to restructure the course's content, drawing on pain points identified as a student who had previously taken it.",
      ],
    },
  ],
  skills: [
    {
      category: "Product",
      items: [
        "Problem definition",
        "Scoping and feature prioritization",
        "Tradeoff analysis",
        "Stakeholder communication",
        "Iteration on user feedback",
      ],
    },
    {
      category: "Technical",
      items: [
        "Advanced Excel (modelling, pivot tables, INDEX/MATCH, Power Query, VBA)",
        "PowerPoint",
        "Power BI",
        "SQL",
        "Python",
        "Jira",
        "Confluence",
        "Bloomberg",
        "Capital IQ",
      ],
    },
    {
      category: "Interests",
      items: ["History and philosophy books", "Soccer", "Basketball", "Muay Thai"],
    },
  ],
  education: [
    {
      institution: "University of Waterloo",
      degree: "Bachelor of Accounting and Financial Management",
      location: "Waterloo, ON",
      startDate: "",
      endDate: "Expected Apr 2027",
      details: [
        "Cumulative GPA: 3.7 / 4.0 | University of Waterloo President's Scholarship of Distinction ($2,000)",
        "Relevant Coursework: Predictive Analytics, Analytic Methods for Business, Corporate Finance",
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Portfolio                                                                  */
/* -------------------------------------------------------------------------- */

const portfolioProjects = [
  {
    name: "Plateau·Dx — Strength Plateau Diagnosis",
    description:
      "A tool that diagnoses stalled lifts instead of just tracking them: it spots the stall, explains the likely cause, and shows the evidence using simple, checkable rules rather than a black-box model. As sole product owner I scoped v1 to three steps, cut nutrition/cardio/social features to keep it focused, and tuned the confidence threshold that governs when the app should speak up.",
    techStack: ["Product ownership", "Decision logic", "AI-assisted development"],
    link: "https://plateau-dx.onrender.com",
    relevantSkills: [
      "product",
      "problem scoping",
      "feature prioritization",
      "tradeoff analysis",
      "decision logic",
    ],
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — seeding aborted.");
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const existing = await prisma.resume.count();
  if (existing > 0) {
    console.log(`Skipping resume seed — ${existing} resume(s) already present.`);
  } else {
    const finance = await prisma.resume.create({
      data: { name: "FP&A / Finance", baseContent: financeResume },
    });
    console.log(`Created resume "${finance.name}" (${finance.id})`);

    const pm = await prisma.resume.create({
      data: { name: "Product Manager", baseContent: pmResume },
    });
    console.log(`Created resume "${pm.name}" (${pm.id})`);
  }

  const existingProjects = await prisma.portfolio.count();
  if (existingProjects > 0) {
    console.log(
      `Skipping portfolio seed — ${existingProjects} project(s) already present.`,
    );
  } else {
    for (const project of portfolioProjects) {
      const created = await prisma.portfolio.create({ data: project });
      console.log(`Created portfolio project "${created.name}"`);
    }
  }

  console.log("\nSeed complete.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
