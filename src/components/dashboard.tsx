"use client";

import {
  AlertTriangle,
  Blocks,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CloudCog,
  Database,
  Info,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculateCombinedScenario, calculateExposure } from "@/lib/calculations";
import type { ExposureRow, GpuModel, MarketSnapshot, PositionDirection } from "@/lib/types";

const GPU_MODELS: GpuModel[] = ["H100", "H200", "B200", "A100", "RTX4090", "OTHER"];

const SAMPLE_ROWS: ExposureRow[] = [
  {
    id: "h100-training",
    gpuModel: "H100",
    provider: "CoreWeave",
    gpuCount: 8,
    hoursPerDay: 12,
    days: 30,
    rateUsdPerGpuHour: 2.85,
    variablePriceShare: 1,
  },
  {
    id: "b200-inference",
    gpuModel: "B200",
    provider: "Cloud marketplace",
    gpuCount: 4,
    hoursPerDay: 8,
    days: 30,
    rateUsdPerGpuHour: 4.25,
    variablePriceShare: 0.75,
  },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const moneyPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

function compactHash(hash: string) {
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
}

function pct(value: number, digits = 1) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function StatusBadge({ status }: { status: MarketSnapshot["provenance"] | "LOADING" }) {
  const styles = {
    LIVE: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    STALE: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    DEMO: "border-sky-400/25 bg-sky-400/10 text-sky-300",
    UNAVAILABLE: "border-red-400/25 bg-red-400/10 text-red-300",
    LOADING: "border-slate-400/20 bg-slate-400/10 text-slate-300",
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "LIVE" ? "animate-pulse bg-emerald-300" : "bg-current"}`} />
      {status}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "positive" | "warning";
}) {
  const colors = tone === "positive" ? "text-[#6ce9ca]" : tone === "warning" ? "text-[#f1b45d]" : "text-white";
  return (
    <div className="panel rounded-2xl p-4 sm:p-5">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#7f919f]">{label}</div>
      <div className={`number-tabular text-2xl font-semibold tracking-[-0.035em] ${colors}`}>{value}</div>
      <div className="mt-2 text-xs text-[#71828f]">{detail}</div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = "any",
  suffix,
  testId,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  suffix?: string;
  testId?: string;
}) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <span className="relative block">
        <input
          data-testid={testId}
          className="field number-tabular pr-11"
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6f818e]">{suffix}</span>}
      </span>
    </label>
  );
}

export function Dashboard() {
  const [rows, setRows] = useState<ExposureRow[]>(SAMPLE_ROWS);
  const [gpuShock, setGpuShock] = useState(20);
  const [siciIndexChange, setSiciIndexChange] = useState(15);
  const [perpExitChange, setPerpExitChange] = useState(15);
  const [direction, setDirection] = useState<PositionDirection>("LONG");
  const [notionalPct, setNotionalPct] = useState(50);
  const [fundingCashFlowPct, setFundingCashFlowPct] = useState(-0.15);
  const [feeBps, setFeeBps] = useState(0.01);
  const [slippageBps, setSlippageBps] = useState(5);
  const [leverage, setLeverage] = useState(2);
  const [manualEntryPrice, setManualEntryPrice] = useState(108);
  const [useLiveEntry, setUseLiveEntry] = useState(true);
  const [market, setMarket] = useState<MarketSnapshot | null>(null);
  const [marketLoading, setMarketLoading] = useState(true);

  const refreshMarket = useCallback(async () => {
    setMarketLoading(true);
    try {
      const response = await fetch("/api/market/sici", { cache: "no-store" });
      const snapshot = (await response.json()) as MarketSnapshot;
      setMarket(snapshot);
      if (snapshot.provenance === "LIVE" && snapshot.takerFeeRate >= 0) {
        setFeeBps(snapshot.takerFeeRate * 10_000);
      }
    } catch {
      setMarket(null);
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshMarket(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshMarket]);

  const exposure = useMemo(() => calculateExposure(rows, gpuShock), [rows, gpuShock]);
  const liveEntryAvailable = market?.provenance === "LIVE" && market.markPrice !== null;
  const entryPrice = useLiveEntry && liveEntryAvailable ? market.markPrice! : manualEntryPrice;
  const exitPrice = Math.max(0.000001, entryPrice * (1 + perpExitChange / 100));
  const notionalUsd = exposure.variableUsd * (notionalPct / 100);

  const scenario = useMemo(
    () =>
      calculateCombinedScenario({
        rows,
        gpuPriceShockPct: gpuShock,
        siciIndexChangePct: siciIndexChange,
        position: {
          direction,
          notionalUsd,
          entryFillPrice: entryPrice,
          exitFillPrice: exitPrice,
          fundingCashFlowPct,
          entryFeeBps: feeBps,
          exitFeeBps: feeBps,
          entrySlippageBps: slippageBps,
          exitSlippageBps: slippageBps,
          leverage,
        },
      }),
    [direction, entryPrice, exitPrice, feeBps, fundingCashFlowPct, gpuShock, leverage, notionalUsd, rows, siciIndexChange, slippageBps],
  );

  const comparisonData = [
    { name: "Baseline", value: scenario.exposure.baselineUsd },
    { name: "No position", value: scenario.noPositionNetCostUsd },
    { name: "With simulation", value: scenario.simulatedNetCostUsd },
  ];

  const updateRow = (id: string, patch: Partial<ExposureRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        gpuModel: "H100",
        provider: "New provider",
        gpuCount: 1,
        hoursPerDay: 8,
        days: 30,
        rateUsdPerGpuHour: 2.5,
        variablePriceShare: 1,
      },
    ]);
  };

  const fetchedLabel = market?.fetchedAt
    ? new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" }).format(new Date(market.fetchedAt))
    : "Not fetched";

  const positionImprovesScenario = scenario.position.netPnlUsd > 0;

  return (
    <main className="subtle-grid min-h-screen pb-14">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080b0f]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#54e3c2]/30 bg-[#54e3c2]/10 text-[#6ce9ca]">
              <Blocks size={19} strokeWidth={1.8} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[-0.02em] text-white">ComputeLock</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#617480]">Risk Intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 text-xs text-[#788a97] sm:flex">
              <span>Injective mainnet</span>
              <ChevronRight size={13} />
            </div>
            <StatusBadge status={marketLoading ? "LOADING" : market?.provenance ?? "UNAVAILABLE"} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-4 pt-7 sm:px-6 lg:px-8">
        <section className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#54e3c2]/20 bg-[#54e3c2]/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#69ddc2]">
              <ShieldCheck size={12} /> Simulation only · No wallet required
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
              GPU cost exposure, translated into decisions.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8596a3]">
              Model your variable compute budget and stress-test an illustrative SICI perpetual position—with every assumption and residual risk visible.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#748692]">
            <Database size={14} /> Calculations run locally in your browser
          </div>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Baseline spend" value={money.format(scenario.exposure.baselineUsd)} detail={`${rows.length} workload${rows.length === 1 ? "" : "s"} · selected horizon`} />
          <Metric label="Variable exposure" value={money.format(scenario.exposure.variableUsd)} detail={`${((scenario.exposure.variableUsd / Math.max(1, scenario.exposure.baselineUsd)) * 100).toFixed(1)}% of baseline spend`} tone="warning" />
          <Metric label="Stressed bill" value={money.format(scenario.exposure.shockedUsd)} detail={`${pct(gpuShock)} user-provided GPU rate shock`} />
          <Metric label="Simulated net cost" value={money.format(scenario.simulatedNetCostUsd)} detail={`${positionImprovesScenario ? "Includes positive" : "Includes negative"} net position P&L`} tone={positionImprovesScenario ? "positive" : "warning"} />
        </section>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.75fr)]">
          <div className="min-w-0 space-y-6">
            <section className="panel overflow-hidden rounded-2xl" aria-labelledby="exposure-heading">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-6">
                <div>
                  <div className="flex items-center gap-2">
                    <CloudCog size={17} className="text-[#65ddc2]" />
                    <h2 id="exposure-heading" className="text-sm font-semibold text-white">Compute exposure</h2>
                  </div>
                  <p className="mt-1.5 text-xs text-[#728490]">User-provided workload and rental-rate assumptions</p>
                </div>
                <button onClick={addRow} data-testid="add-workload" className="inline-flex items-center gap-1.5 rounded-lg border border-[#54e3c2]/25 bg-[#54e3c2]/10 px-3 py-2 text-xs font-semibold text-[#73e8cd] transition hover:bg-[#54e3c2]/15">
                  <Plus size={14} /> Add workload
                </button>
              </div>
              <div className="mobile-scroll">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="border-b border-white/[0.05] bg-black/10 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#6f818e]">
                    <tr>
                      <th className="px-5 py-3 sm:px-6">GPU / provider</th>
                      <th className="px-3 py-3">Count</th>
                      <th className="px-3 py-3">Hours/day</th>
                      <th className="px-3 py-3">Days</th>
                      <th className="px-3 py-3">USD/hour</th>
                      <th className="px-3 py-3">Variable</th>
                      <th className="px-3 py-3 text-right">Baseline</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {scenario.exposure.lines.map((line) => (
                      <tr key={line.id} className="group hover:bg-white/[0.012]">
                        <td className="px-5 py-3 sm:px-6">
                          <div className="flex gap-2">
                            <select aria-label="GPU model" className="field w-[105px] py-2 text-xs" value={line.gpuModel} onChange={(e) => updateRow(line.id, { gpuModel: e.target.value as GpuModel })}>
                              {GPU_MODELS.map((gpu) => <option key={gpu}>{gpu}</option>)}
                            </select>
                            <input aria-label="Provider" className="field min-w-0 py-2 text-xs" value={line.provider} onChange={(e) => updateRow(line.id, { provider: e.target.value })} />
                          </div>
                        </td>
                        {([
                          ["GPU count", "gpuCount", line.gpuCount],
                          ["Hours per day", "hoursPerDay", line.hoursPerDay],
                          ["Days", "days", line.days],
                          ["Rate in USD per GPU hour", "rateUsdPerGpuHour", line.rateUsdPerGpuHour],
                        ] as const).map(([label, key, value]) => (
                          <td className="px-3 py-3" key={key}>
                            <input aria-label={label} className="field number-tabular w-[88px] py-2 text-xs" type="number" min="0" step="any" value={value} onChange={(e) => updateRow(line.id, { [key]: Math.max(0, Number(e.target.value)) })} />
                          </td>
                        ))}
                        <td className="px-3 py-3">
                          <div className="relative w-[90px]">
                            <input aria-label="Variable price share" className="field number-tabular py-2 pr-7 text-xs" type="number" min="0" max="100" value={line.variablePriceShare * 100} onChange={(e) => updateRow(line.id, { variablePriceShare: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#6e808d]">%</span>
                          </div>
                        </td>
                        <td className="number-tabular px-3 py-3 text-right text-xs font-semibold text-[#dbe6eb]">{money.format(line.baselineUsd)}</td>
                        <td className="pr-4 text-right">
                          <button aria-label="Remove workload" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((row) => row.id !== line.id))} className="rounded-md p-2 text-[#52636e] transition hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-25">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] bg-black/10 px-5 py-3 text-xs sm:px-6">
                <span className="text-[#6f818e]">Fixed spend is excluded from GPU price shocks.</span>
                <span className="number-tabular font-medium text-[#bdcbd2]">Fixed {money.format(scenario.exposure.fixedUsd)} · Variable {money.format(scenario.exposure.variableUsd)}</span>
              </div>
            </section>

            <section className="panel rounded-2xl" aria-labelledby="scenario-heading">
              <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <CircleDollarSign size={17} className="text-[#65ddc2]" />
                  <h2 id="scenario-heading" className="text-sm font-semibold text-white">Scenario & perpetual simulation</h2>
                </div>
                <p className="mt-1.5 text-xs text-[#728490]">Index, perpetual, and GPU bill changes are modeled separately</p>
              </div>
              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
                <div>
                  <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#667985]">User scenario assumptions</div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberInput label="GPU rate shock" value={gpuShock} onChange={(value) => setGpuShock(Math.max(-100, value))} min={-100} step={1} suffix="%" testId="gpu-shock" />
                    <NumberInput label="SICI index change" value={siciIndexChange} onChange={setSiciIndexChange} step={1} suffix="%" />
                    <NumberInput label="Perp exit change" value={perpExitChange} onChange={(value) => setPerpExitChange(Math.max(-99.99, value))} min={-99.99} step={1} suffix="%" testId="perp-change" />
                    <NumberInput label="Budget notional" value={notionalPct} onChange={(v) => setNotionalPct(Math.max(0, v))} min={0} step={5} suffix="%" />
                  </div>
                  <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-[11px] leading-5 text-[#b4a383]">
                    Notional equals {notionalPct}% of variable compute budget. This is not {notionalPct}% hedge coverage.
                  </div>
                </div>
                <div>
                  <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#667985]">Position mechanics</div>
                  <div className="mb-3 grid grid-cols-3 rounded-xl border border-[#25313a] bg-[#090e13] p-1">
                    {(["LONG", "SHORT", "NONE"] as PositionDirection[]).map((item) => (
                      <button key={item} onClick={() => setDirection(item)} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${direction === item ? "bg-[#263d3a] text-[#76efd3]" : "text-[#6e808d] hover:text-white"}`}>{item === "NONE" ? "NO POSITION" : item}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberInput label="Signed funding cash flow" value={fundingCashFlowPct} onChange={setFundingCashFlowPct} step={0.05} suffix="%" />
                    <NumberInput label="Leverage illustration" value={leverage} onChange={(v) => setLeverage(Math.max(1, v))} min={1} max={10} step={0.5} suffix="×" />
                    <NumberInput label="Fee per side" value={feeBps} onChange={(v) => setFeeBps(Math.max(0, v))} min={0} step={0.01} suffix="bps" />
                    <NumberInput label="Slippage per side" value={slippageBps} onChange={(v) => setSlippageBps(Math.max(0, v))} min={0} step={0.5} suffix="bps" />
                  </div>
                  <div className="mt-3 text-[11px] text-[#71838f]">Positive funding is received; negative funding is paid. Slippage is a user assumption, not live order-book evidence.</div>
                </div>
              </div>
              <div className="grid gap-5 border-t border-white/[0.06] p-5 sm:p-6 lg:grid-cols-[1fr_0.95fr]">
                <div className="h-[270px]">
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#667985]">Scenario cost comparison</div>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={comparisonData} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.055)" />
                      <XAxis dataKey="name" tick={{ fill: "#71838f", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} tick={{ fill: "#667985", fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                      <Tooltip cursor={{ fill: "rgba(255,255,255,0.025)" }} contentStyle={{ background: "#0b1116", border: "1px solid #27343e", borderRadius: 10, fontSize: 12 }} formatter={(value) => moneyPrecise.format(Number(value))} />
                      <Bar dataKey="value" radius={[7, 7, 2, 2]} maxBarSize={65}>
                        {comparisonData.map((item, index) => <Cell key={item.name} fill={["#526673", "#b37b43", "#4fc7ad"][index]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/10 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">P&L reconciliation</span>
                    <span className="font-mono text-[10px] text-[#61737f]">DETERMINISTIC</span>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <ReconciliationRow label="Position notional" value={moneyPrecise.format(notionalUsd)} />
                    <ReconciliationRow label="Gross perpetual P&L" value={moneyPrecise.format(scenario.position.grossPnlUsd)} signed />
                    <ReconciliationRow label="Funding cash flow" value={moneyPrecise.format(scenario.position.fundingCashFlowUsd)} signed />
                    <ReconciliationRow label="Entry + exit fees" value={`−${moneyPrecise.format(scenario.position.entryFeeUsd + scenario.position.exitFeeUsd)}`} />
                    <ReconciliationRow label="Entry + exit slippage" value={`−${moneyPrecise.format(scenario.position.entrySlippageUsd + scenario.position.exitSlippageUsd)}`} />
                    <div className="my-3 border-t border-white/[0.07]" />
                    <ReconciliationRow label="Net simulated P&L" value={moneyPrecise.format(scenario.position.netPnlUsd)} strong signed />
                    <ReconciliationRow label="Illustrative margin" value={moneyPrecise.format(scenario.position.marginIllustrationUsd)} />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="min-w-0 space-y-6">
            <section className="panel rounded-2xl" aria-labelledby="market-heading">
              <div className="flex items-start justify-between border-b border-white/[0.06] px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-[#65ddc2]" />
                    <h2 id="market-heading" className="text-sm font-semibold text-white">SICI market</h2>
                  </div>
                  <p className="mt-1.5 text-xs text-[#728490]">Official Injective mainnet LCD</p>
                </div>
                <button aria-label="Refresh market data" onClick={() => void refreshMarket()} disabled={marketLoading} className="rounded-lg border border-white/[0.08] p-2 text-[#8294a0] transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50">
                  <RefreshCw size={14} className={marketLoading ? "animate-spin" : ""} />
                </button>
              </div>
              {market?.provenance === "LIVE" ? (
                <div className="p-5">
                  <div className="mb-5 flex items-start justify-between">
                    <div>
                      <div className="number-tabular text-3xl font-semibold tracking-[-0.045em] text-white">{number.format(market.markPrice ?? 0)}</div>
                      <div className="mt-1 text-[11px] text-[#738591]">SICI perpetual mark · index points</div>
                    </div>
                    <StatusBadge status={market.provenance} />
                  </div>
                  <div className="space-y-3 border-t border-white/[0.06] pt-4 text-xs">
                    <MarketRow label="Market" value={market.ticker} />
                    <MarketRow label="Market ID" value={compactHash(market.marketId)} mono title={market.marketId} />
                    <MarketRow label="Status" value={`${market.status} · Perpetual`} />
                    <MarketRow label="Oracle" value={`${market.oracleType} · ${market.oracleBase}`} />
                    <MarketRow label="Quote" value={`${market.quoteSymbol} · ${market.quoteDecimals} decimals`} />
                    <MarketRow label="Initial margin" value={`${(market.initialMarginRatio * 100).toFixed(4)}%`} />
                    <MarketRow label="Maintenance" value={`${(market.maintenanceMarginRatio * 100).toFixed(2)}%`} />
                    <MarketRow label="Fetched" value={fetchedLabel} />
                  </div>
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-sky-300/10 bg-sky-300/[0.04] p-3 text-[11px] leading-5 text-[#849ba8]">
                    <Info size={14} className="mt-0.5 shrink-0 text-[#69a8c0]" /> SICI points are not dollars per GPU-hour. The API does not provide a mark-price observation timestamp, so “live” means a successful current fetch; fetch time is shown above.
                  </div>
                </div>
              ) : (
                <div className="p-5">
                  <div className="mb-4 flex items-center gap-2"><Unplug size={16} className="text-amber-300" /><StatusBadge status={market?.provenance ?? "UNAVAILABLE"} /></div>
                  <p className="text-xs leading-5 text-[#8798a4]">{market?.error ?? "The live adapter could not be reached. No market number is being presented as live."}</p>
                </div>
              )}
              <div className="border-t border-white/[0.06] p-5">
                <label className="mb-2 flex items-center justify-between text-xs text-[#94a3ad]">
                  <span>Entry fill price</span>
                  <span className={useLiveEntry && liveEntryAvailable ? "text-[#67ddc2]" : "text-[#e8b46e]"}>{useLiveEntry && liveEntryAvailable ? "REAL MARKET INPUT" : "USER ASSUMPTION"}</span>
                </label>
                <input aria-label="Entry fill price" className="field number-tabular" type="number" min="0.000001" step="0.01" disabled={useLiveEntry && liveEntryAvailable} value={entryPrice} onChange={(e) => setManualEntryPrice(Math.max(0.000001, Number(e.target.value) || 0.000001))} />
                <label className="mt-3 flex items-center gap-2 text-xs text-[#758793]">
                  <input type="checkbox" checked={useLiveEntry} onChange={(e) => setUseLiveEntry(e.target.checked)} className="accent-[#58d8bd]" /> Use validated live mark when available
                </label>
                <div className="mt-3 flex justify-between text-xs"><span className="text-[#71838f]">Illustrative exit fill</span><span className="number-tabular text-[#d5e0e5]">{number.format(exitPrice)}</span></div>
              </div>
            </section>

            <section className="panel rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#f1b45d]" />
                <h2 className="text-sm font-semibold text-white">Residual risk</h2>
              </div>
              <div className="space-y-3">
                <RiskRow label="GPU ↔ SICI basis gap" value={pct(scenario.basisGapPct)} detail={`${moneyPrecise.format(scenario.basisGapUsd)} budget-equivalent mismatch`} warning />
                <RiskRow label="Residual cost increase" value={moneyPrecise.format(scenario.residualCostIncreaseUsd)} detail="After simulated net position P&L" warning={scenario.residualCostIncreaseUsd > 0} />
                <RiskRow label="Perpetual price return" value={pct(scenario.position.perpetualReturnPct)} detail={`${number.format(scenario.position.contractQuantity)} illustrative contract units`} />
              </div>
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/10 p-4">
                <div className="mb-2 text-xs font-semibold text-[#d7e1e6]">Why this might fail</div>
                <ul className="space-y-2 text-[11px] leading-4 text-[#7d8f9b]">
                  <li>• Your provider rates may move differently from the SICI basket.</li>
                  <li>• Actual fills, funding, and slippage can differ materially.</li>
                  <li>• Leveraged perpetual positions can be liquidated.</li>
                  <li>• SICI uses a trailing seven-day average and may lag spot shocks.</li>
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-[#54e3c2]/15 bg-[#54e3c2]/[0.045] p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#78e5cd]"><CheckCircle2 size={15} /> Calculation boundary</div>
              <p className="text-[11px] leading-5 text-[#829b9b]">
                ComputeLock is a read-only scenario tool. It does not place orders, connect wallets, guarantee savings, or recommend a financial position. All outputs are illustrative.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ReconciliationRow({ label, value, strong, signed }: { label: string; value: string; strong?: boolean; signed?: boolean }) {
  const numericValue = Number(value.replace(/[^0-9.-]/g, ""));
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "font-semibold" : ""}`}>
      <span className={strong ? "text-[#dbe5ea]" : "text-[#748691]"}>{label}</span>
      <span className={`number-tabular ${signed && numericValue > 0 ? "text-[#6ce9ca]" : signed && numericValue < 0 ? "text-[#ff9393]" : "text-[#d4dfe4]"}`}>{value}</span>
    </div>
  );
}

function MarketRow({ label, value, mono, title }: { label: string; value: string; mono?: boolean; title?: string }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-[#6f818e]">{label}</span><span title={title} className={`text-right text-[#c4d0d6] ${mono ? "font-mono text-[10px]" : ""}`}>{value}</span></div>;
}

function RiskRow({ label, value, detail, warning }: { label: string; value: string; detail: string; warning?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.055] bg-black/10 p-3.5">
      <div className="flex items-center justify-between gap-3"><span className="text-xs text-[#8294a0]">{label}</span><span className={`number-tabular text-sm font-semibold ${warning ? "text-[#f1b45d]" : "text-[#dbe5ea]"}`}>{value}</span></div>
      <div className="mt-1 text-[10px] text-[#5f727e]">{detail}</div>
    </div>
  );
}
