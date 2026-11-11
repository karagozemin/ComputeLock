import { describe, expect, it } from "vitest";
import { normalizeSiciMarket } from "@/lib/injective";
import { SICI_MARKET } from "@/lib/market-config";

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    markets: [
      {
        market: {
          ticker: SICI_MARKET.ticker,
          oracle_base: SICI_MARKET.oracleBase,
          oracle_quote: SICI_MARKET.oracleQuote,
          oracle_type: SICI_MARKET.oracleType,
          oracle_scale_factor: SICI_MARKET.oracleScaleFactor,
          quote_denom: SICI_MARKET.quoteDenom,
          market_id: SICI_MARKET.marketId,
          initial_margin_ratio: "0.083333000000000000",
          maintenance_margin_ratio: "0.050000000000000000",
          maker_fee_rate: "0.000001000000000000",
          taker_fee_rate: "0.000001000000000000",
          isPerpetual: true,
          status: "Active",
          min_price_tick_size: "10000.000000000000000000",
          min_quantity_tick_size: "0.001000000000000000",
          min_notional: "1000000.000000000000000000",
          quote_decimals: 6,
          ...overrides,
        },
        perpetual_info: {
          market_info: {
            hourly_funding_rate_cap: "0.000625000000000000",
            next_funding_timestamp: "1794427200",
          },
        },
        mark_price: "108173629.000000000000000000",
      },
    ],
  };
}

describe("normalizeSiciMarket", () => {
  it("validates and converts the official atomic quote values", () => {
    const fetchedAt = new Date("2026-11-11T18:00:00.000Z");
    const result = normalizeSiciMarket(fixture(), fetchedAt);
    expect(result.provenance).toBe("LIVE");
    expect(result.markPrice).toBe(108.173629);
    expect(result.minPriceTick).toBe(0.01);
    expect(result.minNotionalUsd).toBe(1);
    expect(result.marketId).toBe(SICI_MARKET.marketId);
    expect(result.fetchedAt).toBe(fetchedAt.toISOString());
  });

  it("fails closed when trusted market metadata changes", () => {
    expect(() => normalizeSiciMarket(fixture({ oracle_type: "Pyth" }))).toThrow(
      "oracle type mismatch",
    );
  });

  it("fails closed for an inactive market", () => {
    expect(() => normalizeSiciMarket(fixture({ status: "Paused" }))).toThrow(
      "market is not active",
    );
  });
});
