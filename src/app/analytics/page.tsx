import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-text-muted text-sm mt-0.5">
          Computed live from your tracked applications — never a cached snapshot.
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
