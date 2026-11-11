import Decimal from "decimal.js";
import type {
  CombinedScenario,
  ExposureRow,
  ExposureSummary,
  PerpetualSimulationInput,
  PerpetualSimulationResult,
} from "@/lib/types";

const ZERO = new Decimal(0);

function finiteNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite nonnegative number.`);
  }
  return new Decimal(value);
}

function toNumber(value: Decimal) {
  return Number(value.toDecimalPlaces(8).toString());
}

export function calculateExposure(
  rows: ExposureRow[],
  gpuPriceShockPct: number,
): ExposureSummary {
  if (!Number.isFinite(gpuPriceShockPct) || gpuPriceShockPct < -100) {
    throw new Error("GPU price shock must be finite and no lower than -100%.");
  }

  const shock = new Decimal(gpuPriceShockPct).div(100);
  const lines = rows.map((row) => {
    const count = finiteNonNegative(row.gpuCount, "GPU count");
    const hours = finiteNonNegative(row.hoursPerDay, "Hours per day");
    const days = finiteNonNegative(row.days, "Days");
    const rate = finiteNonNegative(row.rateUsdPerGpuHour, "Rental rate");
    const variableShare = finiteNonNegative(row.variablePriceShare, "Variable share");
    if (variableShare.gt(1)) throw new Error("Variable share cannot exceed 1.");

    const baseline = count.mul(hours).mul(days).mul(rate);
    const variable = baseline.mul(variableShare);
    const fixed = baseline.minus(variable);
    const shocked = fixed.plus(variable.mul(new Decimal(1).plus(shock)));

    return {
      ...row,
      baselineUsd: toNumber(baseline),
      fixedUsd: toNumber(fixed),
      variableUsd: toNumber(variable),
      shockedUsd: toNumber(shocked),
    };
  });

  const total = (key: "baselineUsd" | "fixedUsd" | "variableUsd" | "shockedUsd") =>
    lines.reduce((sum, line) => sum.plus(line[key]), ZERO);
  const baseline = total("baselineUsd");
  const shocked = total("shockedUsd");

  return {
    lines,
    baselineUsd: toNumber(baseline),
    fixedUsd: toNumber(total("fixedUsd")),
    variableUsd: toNumber(total("variableUsd")),
    shockedUsd: toNumber(shocked),
    computeCostChangeUsd: toNumber(shocked.minus(baseline)),
  };
}

export function simulatePerpetual(
  input: PerpetualSimulationInput,
): PerpetualSimulationResult {
  const notional = finiteNonNegative(input.notionalUsd, "Position notional");
  const entry = finiteNonNegative(input.entryFillPrice, "Entry fill price");
  const exit = finiteNonNegative(input.exitFillPrice, "Exit fill price");
  const leverage = finiteNonNegative(input.leverage, "Leverage");

  if (input.direction !== "NONE" && entry.lte(0)) {
    throw new Error("Entry fill price must be greater than zero for a position.");
  }
  if (input.direction !== "NONE" && leverage.lt(1)) {
    throw new Error("Leverage must be at least 1× for a position.");
  }

  const isPosition = input.direction !== "NONE" && notional.gt(0);
  const quantity = isPosition ? notional.div(entry) : ZERO;
  const direction = input.direction === "LONG" ? new Decimal(1) : new Decimal(-1);
  const gross = isPosition ? direction.mul(quantity).mul(exit.minus(entry)) : ZERO;
  const exitNotional = quantity.mul(exit);
  const funding = isPosition
    ? notional.mul(new Decimal(input.fundingCashFlowPct).div(100))
    : ZERO;
  const entryFee = isPosition
    ? notional.mul(finiteNonNegative(input.entryFeeBps, "Entry fee").div(10_000))
    : ZERO;
  const exitFee = isPosition
    ? exitNotional.mul(finiteNonNegative(input.exitFeeBps, "Exit fee").div(10_000))
    : ZERO;
  const entrySlippage = isPosition
    ? notional.mul(finiteNonNegative(input.entrySlippageBps, "Entry slippage").div(10_000))
    : ZERO;
  const exitSlippage = isPosition
    ? exitNotional.mul(finiteNonNegative(input.exitSlippageBps, "Exit slippage").div(10_000))
    : ZERO;
  const costs = entryFee.plus(exitFee).plus(entrySlippage).plus(exitSlippage);
  const net = gross.plus(funding).minus(costs);

  return {
    ...input,
    contractQuantity: toNumber(quantity),
    grossPnlUsd: toNumber(gross),
    fundingCashFlowUsd: toNumber(funding),
    entryFeeUsd: toNumber(entryFee),
    exitFeeUsd: toNumber(exitFee),
    entrySlippageUsd: toNumber(entrySlippage),
    exitSlippageUsd: toNumber(exitSlippage),
    totalTradingCostsUsd: toNumber(costs),
    netPnlUsd: toNumber(net),
    marginIllustrationUsd: isPosition ? toNumber(notional.div(leverage)) : 0,
    perpetualReturnPct: isPosition
      ? toNumber(exit.div(entry).minus(1).mul(100))
      : 0,
  };
}

export function calculateCombinedScenario(args: {
  rows: ExposureRow[];
  gpuPriceShockPct: number;
  siciIndexChangePct: number;
  position: PerpetualSimulationInput;
}): CombinedScenario {
  const exposure = calculateExposure(args.rows, args.gpuPriceShockPct);
  const position = simulatePerpetual(args.position);
  const noPositionNetCostUsd = exposure.shockedUsd;
  const simulatedNetCostUsd = exposure.shockedUsd - position.netPnlUsd;
  const residualCostIncreaseUsd = simulatedNetCostUsd - exposure.baselineUsd;
  const offsetRatioPct =
    exposure.computeCostChangeUsd > 0
      ? (position.netPnlUsd / exposure.computeCostChangeUsd) * 100
      : null;
  const basisGapPct = args.gpuPriceShockPct - args.siciIndexChangePct;
  const basisGapUsd = exposure.variableUsd * (basisGapPct / 100);

  return {
    exposure,
    position,
    noPositionNetCostUsd,
    simulatedNetCostUsd,
    residualCostIncreaseUsd,
    offsetRatioPct,
    basisGapPct,
    basisGapUsd,
  };
}
