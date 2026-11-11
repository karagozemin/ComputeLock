export const INJECTIVE_LCD_URL =
  process.env.INJECTIVE_LCD_URL ?? "https://lcd.injective.network";

export const SICI_MARKET = {
  marketId: "0x6751442adea73a2b65adce484dd7bde25d204c9695fc9d5410933171f3417410",
  ticker: "SICI/USDC PERP",
  quoteDenom: "erc20:0xa00C59fF5a080D2b954d0c75e46E22a0c371235a",
  quoteDecimals: 6,
  oracleType: "Provider",
  oracleBase: "SICI/USDC",
  oracleQuote: "InjectiveLabs",
  oracleScaleFactor: 6,
} as const;

export const MARKET_FRESHNESS_THRESHOLD_MS = 2 * 60 * 1000;
export const STALE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
