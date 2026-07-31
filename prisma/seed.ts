import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { ResumeContent } from "../src/lib/schemas";

/**
 * ⚠️ PLACEHOLDER DATA — replace with your real resume before relying on any
 * tailoring output. Claude is instructed to treat the base resume as ground
 * truth and never invent experience, so seeding fake bullets means fake
 * tailored resumes.
 *
 * Run with: npx prisma db seed
 */

const placeholderResume: ResumeContent = {
  contact: {
    name: "Your Name",
    email: "you@example.com",
    phone: "(000) 000-0000",
    location: "Waterloo, ON",
    linkedin: "linkedin.com/in/yourhandle",
    website: "",
  },
  summary:
    "PLACEHOLDER — replace with your real summary. Finance-focused analyst with experience in forecasting, variance analysis, and business partnering.",
  experience: [
    {
      company: "PLACEHOLDER Company",
      title: "Financial Analyst Intern",
      location: "Toronto, ON",
      startDate: "May 2025",
      endDate: "Aug 2025",
      bullets: [
        "PLACEHOLDER — replace with a real bullet from your resume.",
        "PLACEHOLDER — replace with a real bullet from your resume.",
      ],
    },
  ],
  extracurricular: [
    {
      organization: "PLACEHOLDER Club",
      role: "VP Finance",
      startDate: "Sep 2024",
      endDate: "Present",
      bullets: ["PLACEHOLDER — replace with a real bullet."],
    },
  ],
  skills: [
    { category: "Technical", items: ["Excel", "SQL", "Python", "Power BI"] },
    { category: "Finance", items: ["Forecasting", "Variance analysis"] },
  ],
  education: [
    {
      institution: "University of Waterloo",
      degree: "PLACEHOLDER — your program",
      location: "Waterloo, ON",
      startDate: "2023",
      endDate: "2028",
      details: [],
    },
  ],
};

const placeholderProjects = [
  {
    name: "PLACEHOLDER — Project One",
    description:
      "Replace with a real project: what it does, what you built, and the outcome.",
    techStack: ["Python", "pandas"],
    link: "",
    relevantSkills: ["data analysis", "automation"],
  },
  {
    name: "PLACEHOLDER — Project Two",
    description:
      "Replace with a real project: what it does, what you built, and the outcome.",
    techStack: ["TypeScript", "Next.js", "Postgres"],
    link: "",
    relevantSkills: ["full-stack", "product"],
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
    console.log(`Skipping seed — ${existing} resume(s) already present.`);
    await prisma.$disconnect();
    return;
  }

  const resume = await prisma.resume.create({
    data: {
      name: "FP&A / Finance",
      baseContent: placeholderResume,
    },
  });
  console.log(`Created resume "${resume.name}" (${resume.id})`);

  for (const project of placeholderProjects) {
    const created = await prisma.portfolio.create({ data: project });
    console.log(`Created portfolio project "${created.name}"`);
  }

  console.log(
    "\nSeed complete. Replace the PLACEHOLDER content in the app before generating anything you plan to send.",
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
