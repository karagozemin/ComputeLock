export type GpuModel = "H100" | "H200" | "B200" | "A100" | "RTX4090" | "OTHER";

export type ExposureRow = {
  id: string;
  gpuModel: GpuModel;
  provider: string;
  gpuCount: number;
  hoursPerDay: number;
  days: number;
  rateUsdPerGpuHour: number;
  variablePriceShare: number;
};

export type Provenance = "LIVE" | "STALE" | "DEMO" | "UNAVAILABLE";

export type MarketSnapshot = {
  provenance: Provenance;
  source: string;
  network: "mainnet";
  fetchedAt: string;
  sourceObservedAt: string | null;
  ageSeconds: number;
  marketId: string;
  ticker: string;
  status: string;
  isPerpetual: boolean;
  quoteDenom: string;
  quoteSymbol: "USDC";
  quoteDecimals: number;
  oracleType: string;
  oracleBase: string;
  oracleQuote: string;
  oracleScaleFactor: number;
  markPrice: number | null;
  priceUnits: "SICI index points quoted in USDC";
  minPriceTick: number;
  minQuantityTick: number;
  minNotionalUsd: number;
  initialMarginRatio: number;
  maintenanceMarginRatio: number;
  makerFeeRate: number;
  takerFeeRate: number;
  hourlyFundingRateCap: number | null;
  nextFundingAt: string | null;
  validationErrors: string[];
  error: string | null;
};

export type ExposureLineResult = ExposureRow & {
  baselineUsd: number;
  fixedUsd: number;
  variableUsd: number;
  shockedUsd: number;
};

export type ExposureSummary = {
  lines: ExposureLineResult[];
  baselineUsd: number;
  fixedUsd: number;
  variableUsd: number;
  shockedUsd: number;
  computeCostChangeUsd: number;
};

export type PositionDirection = "LONG" | "SHORT" | "NONE";

export type PerpetualSimulationInput = {
  direction: PositionDirection;
  notionalUsd: number;
  entryFillPrice: number;
  exitFillPrice: number;
  fundingCashFlowPct: number;
  entryFeeBps: number;
  exitFeeBps: number;
  entrySlippageBps: number;
  exitSlippageBps: number;
  leverage: number;
};

export type PerpetualSimulationResult = PerpetualSimulationInput & {
  contractQuantity: number;
  grossPnlUsd: number;
  fundingCashFlowUsd: number;
  entryFeeUsd: number;
  exitFeeUsd: number;
  entrySlippageUsd: number;
  exitSlippageUsd: number;
  totalTradingCostsUsd: number;
  netPnlUsd: number;
  marginIllustrationUsd: number;
  perpetualReturnPct: number;
};

export type CombinedScenario = {
  exposure: ExposureSummary;
  position: PerpetualSimulationResult;
  noPositionNetCostUsd: number;
  simulatedNetCostUsd: number;
  residualCostIncreaseUsd: number;
  offsetRatioPct: number | null;
  basisGapPct: number;
  basisGapUsd: number;
};
