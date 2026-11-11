import { describe, expect, it } from "vitest";
import { calculateCombinedScenario, calculateExposure, simulatePerpetual } from "@/lib/calculations";
import type { ExposureRow } from "@/lib/types";

const row: ExposureRow = {
  id: "one",
  gpuModel: "H100",
  provider: "Example",
  gpuCount: 2,
  hoursPerDay: 10,
  days: 5,
  rateUsdPerGpuHour: 3,
  variablePriceShare: 0.6,
};

describe("calculateExposure", () => {
  it("separates fixed and variable spend before applying a shock", () => {
    const result = calculateExposure([row], 20);
    expect(result.baselineUsd).toBe(300);
    expect(result.fixedUsd).toBe(120);
    expect(result.variableUsd).toBe(180);
    expect(result.shockedUsd).toBe(336);
    expect(result.computeCostChangeUsd).toBe(36);
  });

  it("does not shock contractually fixed spend", () => {
    const result = calculateExposure([{ ...row, variablePriceShare: 0 }], 80);
    expect(result.shockedUsd).toBe(300);
  });

  it("supports a complete price decline without producing negative spend", () => {
    const result = calculateExposure([{ ...row, variablePriceShare: 1 }], -100);
    expect(result.shockedUsd).toBe(0);
  });

  it("rejects invalid variable shares", () => {
    expect(() => calculateExposure([{ ...row, variablePriceShare: 1.1 }], 20)).toThrow(
      "Variable share cannot exceed 1",
    );
  });
});

describe("simulatePerpetual", () => {
  it("reconciles long P&L with signed funding, two-sided fees, and slippage", () => {
    const result = simulatePerpetual({
      direction: "LONG",
      notionalUsd: 10_000,
      entryFillPrice: 100,
      exitFillPrice: 115,
      fundingCashFlowPct: -0.2,
      entryFeeBps: 10,
      exitFeeBps: 10,
      entrySlippageBps: 5,
      exitSlippageBps: 5,
      leverage: 2,
    });

    expect(result.contractQuantity).toBe(100);
    expect(result.grossPnlUsd).toBe(1_500);
    expect(result.fundingCashFlowUsd).toBe(-20);
    expect(result.entryFeeUsd).toBe(10);
    expect(result.exitFeeUsd).toBe(11.5);
    expect(result.entrySlippageUsd).toBe(5);
    expect(result.exitSlippageUsd).toBe(5.75);
    expect(result.netPnlUsd).toBe(1_447.75);
    expect(result.marginIllustrationUsd).toBe(5_000);
  });

  it("reverses gross P&L for a short and permits positive funding received", () => {
    const result = simulatePerpetual({
      direction: "SHORT",
      notionalUsd: 10_000,
      entryFillPrice: 100,
      exitFillPrice: 90,
      fundingCashFlowPct: 0.1,
      entryFeeBps: 0,
      exitFeeBps: 0,
      entrySlippageBps: 0,
      exitSlippageBps: 0,
      leverage: 1,
    });
    expect(result.grossPnlUsd).toBe(1_000);
    expect(result.fundingCashFlowUsd).toBe(10);
    expect(result.netPnlUsd).toBe(1_010);
  });

  it("returns zero financial effects when no position is selected", () => {
    const result = simulatePerpetual({
      direction: "NONE",
      notionalUsd: 10_000,
      entryFillPrice: 0,
      exitFillPrice: 0,
      fundingCashFlowPct: -4,
      entryFeeBps: 10,
      exitFeeBps: 10,
      entrySlippageBps: 10,
      exitSlippageBps: 10,
      leverage: 1,
    });
    expect(result.netPnlUsd).toBe(0);
    expect(result.contractQuantity).toBe(0);
  });
});

describe("calculateCombinedScenario", () => {
  it("keeps GPU, index, and perpetual scenarios distinct", () => {
    const result = calculateCombinedScenario({
      rows: [{ ...row, variablePriceShare: 1 }],
      gpuPriceShockPct: 20,
      siciIndexChangePct: 8,
      position: {
        direction: "LONG",
        notionalUsd: 300,
        entryFillPrice: 100,
        exitFillPrice: 115,
        fundingCashFlowPct: 0,
        entryFeeBps: 0,
        exitFeeBps: 0,
        entrySlippageBps: 0,
        exitSlippageBps: 0,
        leverage: 1,
      },
    });
    expect(result.basisGapPct).toBe(12);
    expect(result.basisGapUsd).toBe(36);
    expect(result.exposure.computeCostChangeUsd).toBe(60);
    expect(result.position.grossPnlUsd).toBe(45);
    expect(result.simulatedNetCostUsd).toBe(315);
  });
});
