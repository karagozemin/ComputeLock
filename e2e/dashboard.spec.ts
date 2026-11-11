import { expect, test } from "@playwright/test";

const liveMarket = {
  provenance: "LIVE",
  source: "https://lcd.injective.network/injective/exchange/v1beta1/derivative/markets",
  network: "mainnet",
  fetchedAt: "2026-11-11T18:00:00.000Z",
  sourceObservedAt: null,
  ageSeconds: 0,
  marketId: "0x6751442adea73a2b65adce484dd7bde25d204c9695fc9d5410933171f3417410",
  ticker: "SICI/USDC PERP",
  status: "Active",
  isPerpetual: true,
  quoteDenom: "erc20:0xa00C59fF5a080D2b954d0c75e46E22a0c371235a",
  quoteSymbol: "USDC",
  quoteDecimals: 6,
  oracleType: "Provider",
  oracleBase: "SICI/USDC",
  oracleQuote: "InjectiveLabs",
  oracleScaleFactor: 6,
  markPrice: 108.173629,
  priceUnits: "SICI index points quoted in USDC",
  minPriceTick: 0.01,
  minQuantityTick: 0.001,
  minNotionalUsd: 1,
  initialMarginRatio: 0.083333,
  maintenanceMarginRatio: 0.05,
  makerFeeRate: 0.000001,
  takerFeeRate: 0.000001,
  hourlyFundingRateCap: 0.000625,
  nextFundingAt: "2026-11-11T20:00:00.000Z",
  validationErrors: [],
  error: null,
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/market/sici", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(liveMarket) }),
  );
  await page.goto("/");
});

test("loads a transparent live-market simulation", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "GPU cost exposure, translated into decisions." })).toBeVisible();
  await expect(page.getByText("SICI/USDC PERP")).toBeVisible();
  await expect(page.getByText("108.1736")).toBeVisible();
  await expect(page.getByText("$12,288").first()).toBeVisible();
  await expect(page.getByText("Simulation only · No wallet required")).toBeVisible();
});

test("recalculates the stressed bill from user assumptions", async ({ page }) => {
  const shock = page.getByTestId("gpu-shock");
  await shock.fill("30");
  await expect(page.getByText("$15,668").first()).toBeVisible();
});

test("adds a workload and updates baseline spend", async ({ page }) => {
  await page.getByTestId("add-workload").click();
  await expect(page.getByText("$12,888").first()).toBeVisible();
  await expect(page.getByText("3 workloads · selected horizon")).toBeVisible();
});
