import {
  INJECTIVE_LCD_URL,
  MARKET_FRESHNESS_THRESHOLD_MS,
  SICI_MARKET,
  STALE_CACHE_MAX_AGE_MS,
} from "@/lib/market-config";
import type { MarketSnapshot } from "@/lib/types";

type LcdMarket = {
  market?: Record<string, unknown>;
  perpetual_info?: Record<string, unknown>;
  mark_price?: string;
};

type LcdResponse = { markets?: LcdMarket[] };

let lastGoodSnapshot: MarketSnapshot | null = null;

const text = (value: unknown) => (typeof value === "string" ? value : "");
const numeric = (value: unknown) => Number(text(value));

function fromAtomic(value: unknown, decimals: number) {
  const parsed = numeric(value);
  return Number.isFinite(parsed) ? parsed / 10 ** decimals : 0;
}

function unavailable(error: string): MarketSnapshot {
  const now = new Date().toISOString();
  return {
    provenance: "UNAVAILABLE",
    source: `${INJECTIVE_LCD_URL}/injective/exchange/v1beta1/derivative/markets`,
    network: "mainnet",
    fetchedAt: now,
    sourceObservedAt: null,
    ageSeconds: 0,
    marketId: SICI_MARKET.marketId,
    ticker: SICI_MARKET.ticker,
    status: "Unknown",
    isPerpetual: true,
    quoteDenom: SICI_MARKET.quoteDenom,
    quoteSymbol: "USDC",
    quoteDecimals: SICI_MARKET.quoteDecimals,
    oracleType: SICI_MARKET.oracleType,
    oracleBase: SICI_MARKET.oracleBase,
    oracleQuote: SICI_MARKET.oracleQuote,
    oracleScaleFactor: SICI_MARKET.oracleScaleFactor,
    markPrice: null,
    priceUnits: "SICI index points quoted in USDC",
    minPriceTick: 0,
    minQuantityTick: 0,
    minNotionalUsd: 0,
    initialMarginRatio: 0,
    maintenanceMarginRatio: 0,
    makerFeeRate: 0,
    takerFeeRate: 0,
    hourlyFundingRateCap: null,
    nextFundingAt: null,
    validationErrors: [],
    error,
  };
}

function staleFallback(error: string) {
  if (!lastGoodSnapshot) return unavailable(error);
  const ageMs = Date.now() - new Date(lastGoodSnapshot.fetchedAt).getTime();
  if (ageMs > STALE_CACHE_MAX_AGE_MS) return unavailable(error);
  return {
    ...lastGoodSnapshot,
    provenance: "STALE" as const,
    ageSeconds: Math.floor(ageMs / 1000),
    error,
  };
}

export function normalizeSiciMarket(payload: LcdResponse, fetchedAt = new Date()): MarketSnapshot {
  const selected = payload.markets?.find(
    (item) => text(item.market?.market_id) === SICI_MARKET.marketId,
  );
  if (!selected?.market) {
    throw new Error("Configured SICI market ID was not returned by the official Injective LCD.");
  }

  const market = selected.market;
  const perpetualInfo = selected.perpetual_info ?? {};
  const marketInfo = (perpetualInfo.market_info ?? {}) as Record<string, unknown>;
  const validationErrors: string[] = [];
  const checks: Array<[boolean, string]> = [
    [text(market.market_id) === SICI_MARKET.marketId, "market ID mismatch"],
    [text(market.ticker) === SICI_MARKET.ticker, "ticker mismatch"],
    [text(market.status).toLowerCase() === "active", "market is not active"],
    [market.isPerpetual === true, "market is not perpetual"],
    [text(market.quote_denom) === SICI_MARKET.quoteDenom, "quote denomination mismatch"],
    [Number(market.quote_decimals) === SICI_MARKET.quoteDecimals, "quote decimals mismatch"],
    [text(market.oracle_type) === SICI_MARKET.oracleType, "oracle type mismatch"],
    [text(market.oracle_base) === SICI_MARKET.oracleBase, "oracle base mismatch"],
    [text(market.oracle_quote) === SICI_MARKET.oracleQuote, "oracle quote mismatch"],
    [Number(market.oracle_scale_factor) === SICI_MARKET.oracleScaleFactor, "oracle scale mismatch"],
  ];
  for (const [valid, message] of checks) if (!valid) validationErrors.push(message);

  const markPrice = fromAtomic(selected.mark_price, SICI_MARKET.quoteDecimals);
  if (!(markPrice > 0)) validationErrors.push("mark price is missing or nonpositive");
  if (validationErrors.length) {
    throw new Error(`SICI metadata validation failed: ${validationErrors.join(", ")}.`);
  }

  const nextFundingTimestamp = numeric(marketInfo.next_funding_timestamp);
  const snapshot: MarketSnapshot = {
    provenance: "LIVE",
    source: `${INJECTIVE_LCD_URL}/injective/exchange/v1beta1/derivative/markets`,
    network: "mainnet",
    fetchedAt: fetchedAt.toISOString(),
    sourceObservedAt: null,
    ageSeconds: 0,
    marketId: text(market.market_id),
    ticker: text(market.ticker),
    status: text(market.status),
    isPerpetual: market.isPerpetual === true,
    quoteDenom: text(market.quote_denom),
    quoteSymbol: "USDC",
    quoteDecimals: Number(market.quote_decimals),
    oracleType: text(market.oracle_type),
    oracleBase: text(market.oracle_base),
    oracleQuote: text(market.oracle_quote),
    oracleScaleFactor: Number(market.oracle_scale_factor),
    markPrice,
    priceUnits: "SICI index points quoted in USDC",
    minPriceTick: fromAtomic(market.min_price_tick_size, SICI_MARKET.quoteDecimals),
    minQuantityTick: numeric(market.min_quantity_tick_size),
    minNotionalUsd: fromAtomic(market.min_notional, SICI_MARKET.quoteDecimals),
    initialMarginRatio: numeric(market.initial_margin_ratio),
    maintenanceMarginRatio: numeric(market.maintenance_margin_ratio),
    makerFeeRate: numeric(market.maker_fee_rate),
    takerFeeRate: numeric(market.taker_fee_rate),
    hourlyFundingRateCap: Number.isFinite(numeric(marketInfo.hourly_funding_rate_cap))
      ? numeric(marketInfo.hourly_funding_rate_cap)
      : null,
    nextFundingAt: nextFundingTimestamp > 0
      ? new Date(nextFundingTimestamp * 1000).toISOString()
      : null,
    validationErrors,
    error: null,
  };
  return snapshot;
}

export async function fetchSiciMarket(): Promise<MarketSnapshot> {
  try {
    const response = await fetch(
      `${INJECTIVE_LCD_URL}/injective/exchange/v1beta1/derivative/markets`,
      { cache: "no-store", signal: AbortSignal.timeout(8_000) },
    );
    if (!response.ok) throw new Error(`Injective LCD returned HTTP ${response.status}.`);
    const payload = (await response.json()) as LcdResponse;
    const snapshot = normalizeSiciMarket(payload);
    lastGoodSnapshot = snapshot;
    return snapshot;
  } catch (error) {
    return staleFallback(error instanceof Error ? error.message : "Unknown market-data error.");
  }
}

export function classifySnapshotAge(snapshot: MarketSnapshot, now = Date.now()) {
  const ageMs = now - new Date(snapshot.fetchedAt).getTime();
  if (snapshot.provenance === "LIVE" && ageMs > MARKET_FRESHNESS_THRESHOLD_MS) {
    return { ...snapshot, provenance: "STALE" as const, ageSeconds: Math.floor(ageMs / 1000) };
  }
  return { ...snapshot, ageSeconds: Math.max(0, Math.floor(ageMs / 1000)) };
}
