"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/client";
import { Spinner, ErrorBanner, EmptyState } from "@/components/ui";

interface Analytics {
  totals: {
    totalJobs: number;
    applications: number;
    interviews: number;
    offers: number;
    documents: number;
  };
  rates: {
    responseRate: number;
    interviewRate: number;
    offerRate: number;
    avgDaysToResponse: number | null;
  };
  applicationsOverTime: { month: string; count: number }[];
  funnel: { stage: string; count: number }[];
  byResumeVersion: {
    name: string;
    applied: number;
    interviews: number;
    offers: number;
    interviewRate: number;
  }[];
  statusCounts: Record<string, number>;
}

const CHART_COLORS = {
  accent: "#4f8cff",
  good: "#3fb950",
  warn: "#d29922",
  grid: "#253141",
  axis: "#6b7986",
};

export function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Analytics>("/api/analytics")
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data)
    return (
      <div className="card p-10 flex justify-center text-text-muted">
        <Spinner />
      </div>
    );

  if (data.totals.totalJobs === 0) {
    return (
      <EmptyState
        title="No data yet"
        hint="Once you start applying and updating statuses, your funnel and rates show up here."
      />
    );
  }

  const t = data.totals;
  const r = data.rates;

  return (
    <div className="space-y-5">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Applications" value={t.applications} />
        <Stat label="Response rate" value={`${r.responseRate}%`} />
        <Stat label="Interview rate" value={`${r.interviewRate}%`} />
        <Stat
          label="Avg days to response"
          value={r.avgDaysToResponse ?? "—"}
          hint="business days"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Applications over time */}
        <ChartCard title="Applications over time">
          {data.applicationsOverTime.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.applicationsOverTime}>
                <defs>
                  <linearGradient id="apps" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={CHART_COLORS.accent}
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="100%"
                      stopColor={CHART_COLORS.accent}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke={CHART_COLORS.axis}
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke={CHART_COLORS.axis}
                  fontSize={12}
                  allowDecimals={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<DarkTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Applications"
                  stroke={CHART_COLORS.accent}
                  strokeWidth={2}
                  fill="url(#apps)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <NoChart hint="No applied dates yet." />
          )}
        </ChartCard>

        {/* Funnel */}
        <ChartCard title="Funnel">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.funnel} layout="vertical">
              <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
              <XAxis
                type="number"
                stroke={CHART_COLORS.axis}
                fontSize={12}
                allowDecimals={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="stage"
                stroke={CHART_COLORS.axis}
                fontSize={12}
                tickLine={false}
                width={84}
              />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: "#ffffff08" }} />
              <Bar dataKey="count" name="Jobs" radius={[0, 4, 4, 0]}>
                {data.funnel.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      [CHART_COLORS.accent, CHART_COLORS.warn, CHART_COLORS.good][
                        i
                      ] ?? CHART_COLORS.accent
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Per resume version */}
      <ChartCard title="Performance by resume version">
        {data.byResumeVersion.length ? (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byResumeVersion}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={CHART_COLORS.axis}
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke={CHART_COLORS.axis}
                  fontSize={12}
                  allowDecimals={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "#ffffff08" }} />
                <Bar
                  dataKey="applied"
                  name="Applied"
                  fill={CHART_COLORS.accent}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="interviews"
                  name="Interviews"
                  fill={CHART_COLORS.warn}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="offers"
                  name="Offers"
                  fill={CHART_COLORS.good}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 text-xs text-text-muted">
              {data.byResumeVersion.map((v) => (
                <span key={v.name}>
                  <span className="text-text">{v.name}</span> —{" "}
                  {v.interviewRate}% interview rate
                </span>
              ))}
            </div>
          </div>
        ) : (
          <NoChart hint="No applications tied to a resume version yet." />
        )}
      </ChartCard>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-text-muted text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {hint ? <p className="text-text-dim text-xs mt-0.5">{hint}</p> : null}
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4 space-y-3">
      <h3 className="text-sm font-medium text-text-muted">{title}</h3>
      {children}
    </div>
  );
}

function NoChart({ hint }: { hint: string }) {
  return (
    <div className="h-[240px] grid place-items-center text-text-dim text-sm">
      {hint}
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

function DarkTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-strong bg-bg-elevated px-3 py-2 text-xs shadow-lg">
      {label ? <p className="text-text-muted mb-1">{label}</p> : null}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}
