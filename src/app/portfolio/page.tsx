import { prisma, CURRENT_USER_ID } from "@/lib/prisma";
import { toPortfolioDTO } from "@/lib/serialize";
import { PortfolioManager } from "@/components/PortfolioManager";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const projects = await prisma.portfolio.findMany({
    where: { userId: CURRENT_USER_ID },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="text-text-muted text-sm mt-0.5">
          Side projects Runway can weave into a cover letter or tailored resume —
          it picks the single most relevant one, never all of them.
        </p>
      </div>
      <PortfolioManager initial={projects.map(toPortfolioDTO)} />
    </div>
  );
}
