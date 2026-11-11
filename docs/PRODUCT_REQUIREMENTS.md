# ComputeLock — Product Requirements Document

**Working name:** ComputeLock\
**Tagline:** Make AI compute costs measurable, explainable, and hedgeable.\
**Version:** 1.1 — November 11, 2026\
**Status:** P0 implemented and verified locally; deployment pending owner approval\
**Network:** Injective\
**Repository:** https://github.com/karagozemin/ComputeLock\
**Initial build window:** Injective Bangkok Hacker House, December 1–10, 2026 (subject to admission)\
**Owner:** Kaptan / Overblock

> **Product principle:** ComputeLock must never claim a financial hedge has eliminated a cloud-compute bill. It measures exposure and illustrates possible offsets; real-world outcomes depend on basis risk, liquidity, funding, execution, and actual GPU usage.

## 1. Executive summary

AI startups, research labs, and infrastructure teams rent GPUs under variable pricing. Their future compute bills depend on GPU type, utilization, provider, region, and time. They have budgets in dollars but little tooling to compare their cost exposure with emerging onchain markets.

**ComputeLock** is an initially **read-only and simulation-first** risk cockpit for GPU compute. A team enters its expected GPU consumption, rental rates, and risk preferences; ComputeLock builds a transparent projection of compute spend, connects to the **Super Intelligence Compute Index (SICI)** perpetual market on Injective, and simulates how different SICI-linked positions might change outcomes under adverse price scenarios.

The first release does **not** place real trades or promise cost savings. It ships a functioning risk-analysis workflow, a live SICI market-data integration where available, hedge scenario comparisons, clear uncertainty disclosures, and a reproducible demo. Future releases can add consent-based execution, provider billing integrations, and a fuller risk engine.

### One-sentence pitch

**ComputeLock helps AI teams understand and stress-test GPU rental cost exposure, then explore SICI-linked hedging strategies on Injective without hiding the risks.**

### Core hypothesis

AI infrastructure teams will value a transparent compute-cost risk dashboard more than an opaque AI trading bot, especially if it turns provider-level GPU requirements into specific budget scenarios and traceable simulations.

## 2. Market context and verified constraints

Injective announced SICI on **October 26, 2026**. SICI follows a weighted basket of GPU rental prices: H100 (40%), B200 (25%), H200 (15%), A100 (10%), and RTX 4090 (10%). The underlying components are rebased and aggregated into an index using a **trailing seven-day average**, struck hourly. **Index points are not US dollars per GPU-hour.** The SICI perpetual is available on Injective mainnet, with USDC collateral and up to 10x leverage reported by Injective. **This is market capability, not a product-recommended leverage level.**

Injective also introduced **SICI options** on October 27, 2026 as part of an initial **testnet / whitelist rollout**. ComputeLock may use options only in simulations or an explicitly access-approved integration; the MVP does not presume a public production options market.

SICI exposure is **not equivalent** to locking a GPU reservation price: the index basket and seven-day smoothing may differ from a specific customer's provider, hardware, location, discounts, and actual bills. Any financial hedge must show this **basis risk** explicitly.

**Technical dependencies that require verification at implementation:** exact SICI derivative market ID and status; production indexer endpoints and rate limits; access to index and mark-price history; order book depth, spread, funding, and volume; availability of historical GPU rental-rate data under a license; current TypeScript SDK APIs. Never hard-code or invent market IDs, historical prices, liquidity, or returns.

## 3. Problem definition

### Users struggle with

1. **Unknown future spend:** An AI team knows planned GPU-hours but cannot quickly see the cost of a 10–30% rental-rate increase.
2. **Fragmented exposure:** H100, H200, and B200 workloads may be spread across cloud providers with different rates and contract terms.
3. **No decision context:** A market price chart alone does not explain whether a SICI position would plausibly offset a team's budget risk.
4. **Hidden hedging risks:** Perpetual funding, basis mismatch, price slippage, and liquidation can make a supposed hedge worse than the original exposure.
5. **Overcomplicated tools:** Teams need a budgeting and risk-management workflow, not a generic derivatives trading terminal.

### Jobs to be done

> When I commit to the next month of GPU usage, I want to estimate my bill under several plausible market conditions and understand whether a SICI-linked strategy would reduce or increase my downside, so I can make a better budget decision.

## 4. Target customers and positioning

| Persona | Starting pain | Desired outcome | MVP fit |
|---|---|---|---|
| AI startup founder / CTO | GPU costs can overwhelm runway | 30-day budget at risk and readable scenarios | Primary |
| AI infrastructure / FinOps lead | Multiple GPU types and providers | Portfolio-level exposure map | Primary |
| GPU marketplace operator | Revenue drops when rental prices fall | Explore short-side risk management | Discovery only |
| DeFi derivatives trader | Wants compute-index analytics | Understand SICI mechanics | Secondary, not core buyer |

**Wedge:** small and mid-sized AI teams with variable cloud GPU spending; avoid broad claims of serving all enterprise treasury workflows at MVP stage.

**Differentiation:** maps real compute usage to *financial exposure* and explains basis/funding/liquidation risks. This is not “another agent that trades perps.”

## 5. Objectives, success metrics, and non-goals

### 10-day MVP objectives

- A new user can create a GPU workload profile in **under 3 minutes** using manual inputs or an example profile.
- The app computes baseline 30-day cost and at least **three market scenarios** from transparent assumptions.
- The app displays genuine Injective SICI market information whenever its live adapter is healthy; stale/unavailable values are clearly labeled and never silently replaced with fabricated “live” data.
- Users can compare **no hedge**, **partial hedge**, and **higher-coverage simulated hedge**, including downside, funding, slippage, and basis assumptions.
- Explanations are understandable to non-traders and traceable to calculated numbers.
- A public demo, reproducible scenarios, tests, deployment, and clear README are shipped.

### Proposed MVP success gates (targets, not claims)

| Metric | Acceptance target |
|---|---|
| End-to-end demo | 100% of scripted demo flow finishes without manual repair |
| Calculation correctness | Unit tests cover every formula and identified boundary case; reference examples match expected results |
| Pricing integrity | Every market-sourced value has source, fetch timestamp, market ID, units, and freshness indicator |
| Scenario speed | Under 2 seconds for typical manual scenario calculations after input |
| User comprehension | At least 4 of 5 pilot users can explain the biggest remaining risk after viewing the result |
| Data failure handling | Unavailable feed produces explicit degraded state; simulation still works with marked example inputs |

### Out of scope for MVP

- Unattended real-money trading, custody, key management, or guaranteed hedges.
- A new onchain perpetual or options protocol, market making, a token, or complex tokenomics.
- Claiming regulatory approval, hedging suitability, or universal provider coverage.
- Proprietary “predictive AI” presented as accurate without training/evaluation data.
- Direct AWS/GCP/RunPod billing ingestion unless a provider grants workable access and time permits.

## 6. Product workflow

**Step 1 — Describe compute exposure.** Enter provider, GPU model, hours per day, days, number of GPUs, current $/GPU-hour, and the percentage of spend with a fixed contractual price. Alternatively load “Training Startup” sample data (clearly labeled synthetic).

**Step 2 — See projected spend.** Show baseline monthly cost, cost by GPU, floating vs fixed exposure, and scenario ranges. Use plain-language explanations of what could change.

**Step 3 — View SICI market context.** Show index/perpetual mark price, funding, spread, order book/depth when accessible, timestamps, and data provenance. Explain that SICI points are not dollar GPU-hour prices and that recent moves may lag market spikes.

**Step 4 — Simulate a position.** The user selects horizon, direction (a long illustration for GPU buyers studying rising-price risk; a short illustration for GPU lessors studying falling-price risk), notional as a percentage of variable compute budget, leverage for educational simulation, and stress assumptions. The engine shows selected **notional exposure**, estimated margin requirement, P&L, fees, signed funding cash flow, and margin stress—not a recommendation or trade order. A notional percentage must never be labeled as equivalent hedge coverage.

**Step 5 — Compare outcomes.** Side-by-side “unhedged / simulated strategy A / simulated strategy B” with net cost ranges, residual exposure, and explicit basis risk. Users can change assumptions; all results recalculate deterministically.

**Step 6 — Share/export.** Generate a short risk report with input assumptions, formulas, market snapshot, and warning labels. Initial export can be JSON or printable page; PDF is optional.

## 7. Functional requirements

### P0 — required for Hacker House demo

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-01 | Create/edit/delete exposure rows | Multiple GPU rows with model, count, hours, duration, provider and rate; form validates nonnegative inputs |
| FR-02 | Baseline spend engine | Correct USD total and per-GPU breakdown, fixed vs variable spend, explicit time horizon |
| FR-03 | Market adapter for SICI | Discover active derivative by symbol/market metadata, read current market state and price from Injective; show errors honestly |
| FR-04 | Source and freshness | Every market value shows UTC fetch timestamp and LIVE / STALE / DEMO / UNAVAILABLE status; upstream observation time is shown separately when available |
| FR-05 | Deterministic scenario engine | Up / flat / down cases plus custom scenario; unit-tested formulas |
| FR-06 | Hedge simulator | Long/short SICI exposure, user-entered notional, configurable funding, trading costs, slippage and basis sensitivity |
| FR-07 | Risk visualization | Unhedged vs hedge net spend, worst case, costs and residual basis mismatch |
| FR-08 | Explainability | Every simulation result includes verifiable calculation drivers and a “why this might fail” section; the product makes no financial recommendation |
| FR-09 | Reproducible demo | Seeded synthetic dataset, example scenarios and a scripted workflow run without live market dependency |
| FR-10 | No real order placement | No mainnet signing, no wallet deposits, no execution, no automated trading by default |

### P1 — if core flow is stable

- CSV import for workload lines (GPU model, start/end, quantity, provider, USD/hour).
- Basic historical chart where actual permitted history exists; never pad missing history as real.
- AI explanation layer that narrates outputs of the deterministic engine without calculating numbers itself.
- Downloadable risk report (CSV / JSON / printable HTML).
- Simple saved scenarios, risk tolerance presets, compare two proposed hedge ratios.
- Optional wallet connection **read-only** for identifying a public address and seeing relevant public positions, with separate consent.

### P2 — after Hacker House

- Billing API integrations (AWS/GCP, decentralized GPU providers) with user permissions.
- Robust empirical covariance/beta estimation using overlapping licensed usage and SICI histories.
- SICI options analysis, then integration if production access and market availability are confirmed.
- User-approved and self-custodied execution flow, with explicit pre-trade checks and regional legal review.
- Continuous alerts and hedging policy automation with human approvals.
- Multi-team organizations, audit trails, role-based access and enterprise reporting.

## 8. Pricing and hedge methodology

### 8.1 Baseline spend

For GPU workload row *i*:

`cost_i = GPU_count_i × hours_per_day_i × days_i × rental_rate_usd_per_gpu_hour_i`

`baseline_horizon_spend = Σ cost_i`

If a rate is contractually fixed, only its **unfixed share** participates in price-shock simulations.

### 8.2 Cost scenarios

For a scenario price change `s_i` and variable share `v_i`:

`scenario_cost = Σ cost_i × [(1 - v_i) + v_i × (1 + s_i)]`

Show **absolute USD change** from baseline. GPU usage changes must be modeled separately; do not assume usage stays fixed if the user says otherwise.

### 8.3 SICI scenario model

The GPU-bill scenario, SICI index scenario, and SICI perpetual-price scenario are separate assumptions. Never use index return as if it were automatically the realized perpetual return. Model the perpetual position using entry and exit fill prices:

`direction = +1 for LONG, -1 for SHORT`

`contract_quantity = position_notional_usd / perp_entry_fill_price`

`gross_perp_pnl_usd = direction × contract_quantity × (perp_exit_fill_price - perp_entry_fill_price)`

`net_perp_pnl_usd = gross_perp_pnl_usd + funding_cash_flow_usd - entry_fee_usd - exit_fee_usd - entry_slippage_usd - exit_slippage_usd`

`funding_cash_flow_usd` is signed: positive when the position receives funding and negative when it pays funding. Fees and slippage are nonnegative costs. The application may also display `r_perp = (perp_exit_fill_price / perp_entry_fill_price) - 1`, but it must preserve the distinction between the index level and the tradable perpetual price.

This remains a simulation, not an exchange settlement or execution engine. Contract units, margin rules, funding mechanics, order-book depth, and actual fills must be verified against current market metadata before any executable version.

For GPU buyers, rising rental costs can motivate studying a **long** SICI exposure; for GPU providers concerned about falling rental revenue, study the **short** side. In both cases, actual protection can fail due to basis and implementation costs.

### 8.4 Basis-risk model

**Never** assume a 1% move in SICI causes a 1% move in a specific user's cloud bill. In MVP, let users set an explicit scenario relationship—e.g., “my variable GPU bill rises 12% while SICI rises 8%”—and show the residual difference.

When reliable overlapping data becomes available, estimate hedge sensitivity using statistical analysis and report uncertainty. For changes in **USD spending**, an exploratory minimum-variance notional estimate can be:

`N* = Cov(ΔCost_USD, r_index) / Var(r_index)`

This requires enough representative, aligned observations; it must be disabled if data is insufficient or relationships are unstable. Correlation alone is not a hedge ratio.

### 8.5 Risk controls and disclosures

- Simulate funding rate stress, bid/ask spread, slippage, fee drag and margin calls / liquidation sensitivity.
- Present low and moderate leverage presets for illustration only; do **not** default to the maximum leverage available on exchange.
- Explicitly warn that a perpetual has no fixed expiry, can require ongoing funding, and can be liquidated.
- Display expected result in *USD and % of compute budget* alongside the underlying index return.
- Clearly separate **market observation**, **user assumption**, **synthetic example**, and **model estimate**.
- If market depth/funding data is missing, mark that risk as “unknown,” not zero.

### Worked illustrative example (entirely synthetic)

A team projects **$10,000** variable GPU spend. Under a chosen stress case, the GPU bill rises **20%** to **$12,000**, while SICI rises **15%**. A simulated **$10,000 long notional** produces roughly **$1,500 gross P&L** before fees and funding; net spend is **$10,500 + costs**. Residual risk remains. A different GPU/SICI relationship could make this hedge ineffective or harmful.

## 9. AI component: useful without being unsafe or fake

**Role:** Explain risk and help users navigate scenarios. AI must not invent index values, prices, financial returns, or validated hedging performance.

**Pipeline:** deterministic calculation engine → structured verified scenario JSON → language model summarizer → schema and number consistency check → user-visible explanation.

**Example inputs:** workload profile, calculated spend, simulated strategies, source timestamps, basis assumptions, warnings.

**Example output:**

- “Your largest variable cost is H100 rentals (62% of projected GPU spend).”
- “The long SICI simulation offsets part of the price-rise scenario, but actual cloud rates may move differently from SICI.”
- “Funding and liquidation risk mean this is not a guaranteed cost lock.”

**Guardrails:** no private key handling; no autonomous trades; no numeric computation delegated to generative text; no PII in model calls without opt-in; no `best strategy` label absent adequate assumptions.

## 10. UX / screens

### Screen A — Overview

Headline “Know your next GPU bill before it surprises you.” CTA: **Create exposure profile**. Display example scenario entry for first-time visitors.

### Screen B — Exposure Builder

Editable table of GPU rows, import (P1), current spend graph, fixed-vs-floating share and 30-day baseline.

### Screen C — SICI Market Intelligence

SICI mark/index chart, source and timestamp, index basket weights, funding and available order book risk metrics; explain that basket values are rebased index points, not raw rental-dollar rates.

### Screen D — Hedge Lab

Scenario sliders and three cards: No Position / Notional Equal to 50% of Variable Budget / Custom Simulation. Show baseline, shocked bill, simulated perpetual P&L, signed funding cash flow, fees, slippage, net spend, and residual exposure. Do not call notional percentage “hedge coverage.”

### Screen E — Risk Report

Plain-English summary, assumptions, input data, chart, sensitivity table, download and visible **simulation only** disclosure.

### UX direction

Neutral fintech visual style, high information density without overwhelming first-time users, strong whitespace, direct numbers, minimal decoration. No token price ticker as the core home-page hero; this is a FinOps decision tool.

## 11. Technical architecture

```text
Next.js / React / TypeScript UI
  ├── Exposure Profile Editor
  ├── SICI Market View
  ├── Hedge Simulation Lab
  └── Risk Report
          │
          ▼
Application API (TypeScript)
  ├── Profile/Scenario Store (SQLite/Prisma or hosted Postgres)
  ├── Deterministic Risk Engine (pure TS functions)
  ├── InjectiveMarketAdapter (read-only)
  │     ├── Derivative market discovery / metadata
  │     ├── Price snapshots / historical data
  │     └── Funding / order book when supported
  ├── Synthetic Demo Fixture Adapter (explicitly labeled)
  └── Optional AI Explainer (P1; bounded structured output)
          │
          ▼
Injective Indexer / Chain read APIs
```

**Suggested stack:** TypeScript, Next.js, React, Tailwind CSS, a charting library, Zod schema validation, Vitest for deterministic calculations, and Playwright for the critical browser flow. For a solo 10-day build, start with local persistence or lightweight hosted storage; do not build microservices.

**Injective integration:** use official public read-only endpoints and, where useful, the official TypeScript SDK. The Indexer API is appropriate for market/history reads; chain APIs support onchain state and transaction-oriented operations. Wrap endpoints in a versioned market adapter so failures and SDK changes are isolated. Keep the expected SICI market identity in reviewed configuration, then validate it against current network metadata on every fetch: market ID, exact ticker, active status, perpetual flag, quote denomination and decimals, oracle type/base/quote, scale factor, and price conversion. Ticker-only discovery is insufficient and must never cause an unknown market to be trusted automatically.

**Data-source strategy:**

1. `LIVE`: a successful current SICI read from the configured official endpoint with `source`, `marketId`, `fetchedAt`, `network`, and `units`; include a separate upstream observation time when the source provides one.
2. `STALE`: a previously valid snapshot older than the two-minute MVP freshness threshold (clearly marked with its age).
3. `DEMO`: fixed, synthetic fixtures used only for reproducible demonstrations (prominent badge).
4. `UNAVAILABLE`: integration failure, with specific reason and no false live number.

Do not label synthetic historical data “backtest” unless it uses a real, documented dataset. Report “scenario analysis” instead.

### Suggested domain types

```ts
type Provenance = 'LIVE' | 'STALE' | 'DEMO' | 'UNAVAILABLE';

type ExposureRow = {
  id: string;
  gpuModel: 'H100' | 'H200' | 'B200' | 'A100' | 'RTX4090' | 'OTHER';
  provider: string;
  gpuCount: number;
  hoursPerDay: number;
  days: number;
  rateUsdPerGpuHour: number;
  variablePriceShare: number; // 0..1
};

type MarketSnapshot = {
  marketId: string | null;
  ticker: string;
  provenance: Provenance;
  fetchedAt: string | null;
  sourceObservedAt: string | null;
  indexPoints: number | null;
  markPrice: number | null;
  fundingRate: number | null;
  spreadBps: number | null;
  network: 'mainnet' | 'testnet' | 'demo';
};

type HedgeScenario = {
  indexReturn: number;
  gpuPriceShocksByModel: Record<string, number>;
  hedgeDirection: 'LONG' | 'SHORT' | 'NONE';
  notionalUsd: number;
  perpEntryFillPrice: number;
  perpExitFillPrice: number;
  fundingCashFlowUsd: number; // signed: positive received, negative paid
  entryFeeUsd: number;
  exitFeeUsd: number;
  entrySlippageUsd: number;
  exitSlippageUsd: number;
};
```

### Proposed API contracts

- `GET /api/markets/sici` → normalized market snapshot + provenance.
- `POST /api/exposure/calculate` → baseline and shocked spend per GPU model.
- `POST /api/hedge/simulate` → scenario outcomes, costs, and warnings.
- `GET /api/demo/scenarios` → explicitly synthetic sample input library.
- `POST /api/report` → exportable scenario report (optional P1).

Calculation endpoints must be deterministic and testable without network access.

## 12. Non-functional requirements

- **Safety:** read-only Injective connection for MVP; no secret key in browser or server logs, no signing.
- **Accuracy:** financial values stored/handled with explicit precision and currency; avoid binary-float rounding at settlement boundaries. Display rounded values, calculate with a decimal library where needed.
- **Privacy:** manual workload data can remain local by default; provide delete/reset; explain any telemetry or AI processing.
- **Resilience:** rate-limit retries with backoff; cache reads sensibly; live API down must not break local simulations.
- **Accessibility:** semantic form labels, keyboard navigation, readable charts with text equivalents.
- **Observability:** capture fetch errors, stale data occurrences and failed scenario validations without collecting confidential billing records.
- **Security:** validate all inputs, rate-limit public APIs, protect any future server credentials, sanitize exports; never execute model-generated commands.
- **Transparency:** label simulated, observed, and estimated data in every relevant UI and export.

## 13. Ten-day execution plan

| Day | Workstream | Concrete deliverable |
|---|---|---|
| 1 | Scope and validation | Final persona, user story, UI wireframe, SICI data/API feasibility check |
| 2 | Foundation | Working Next.js app, type schemas, seed datasets, CI/test setup |
| 3 | Cost engine | Exposure form, monthly baseline, fixed/variable share, unit tests |
| 4 | Injective adapter | Live SICI data where accessible, provenance and graceful fallback |
| 5 | Risk engine | Scenario calculations, long/short simulation, funding and basis warnings |
| 6 | Hedge Lab | Comparison visuals, controls, documented examples |
| 7 | AI explanations | Optional verifiable natural-language layer; otherwise clear templates |
| 8 | Polish and testing | E2E flow, error states, accessibility and documentation |
| 9 | User feedback | Run 3–5 pilot walkthroughs, fix comprehension and correctness issues |
| 10 | Demo Day | Public deployment, demo video, README, deck and roadmap |

**Hard milestone:** by the end of Day 5, a user must be able to enter a workload and compare unhedged vs simulated hedge outcomes. Everything else is secondary.

**Scope-cut order if blocked:** remove generative AI → remove persistence → remove historic charts → keep live current market read and deterministic simulation. If SICI APIs are inaccessible, demo must say so plainly and use synthetic examples; a fake market feed is never acceptable.

## 14. Demo Day narrative (3 minutes)

1. **Problem (20s):** “AI founders cannot predict GPU prices, yet GPU bills can determine runway.”
2. **Input (35s):** Create a 30-day H100/B200 workload; show forecasted spend.
3. **Market insight (35s):** Show the actual Injective SICI connection and explain how a basket-based market differs from the user's bill.
4. **Stress test (55s):** Simulate GPU costs rising and compare no hedge vs a transparent SICI-linked strategy; reveal funding, basis and margin risks.
5. **Why Injective (20s):** The live SICI market makes compute-price financial exposure possible; Injective read APIs make market context available without creating a new derivative.
6. **What shipped / next (15s):** Public product, verifiable calculations, repo, tests, and plan for provider integrations and consent-based execution.

**Suggested positioning:** “Not another AI trading bot. An operating system for AI compute risk.”

## 15. Main risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| SICI market has limited liquidity or unsuitable funding | Simulated hedges may be impractical live | Show spread/depth/funding where available; state ‘cannot validate executability’ otherwise |
| Actual GPU invoices diverge from SICI | Large residual basis risk | User-specific inputs, separate shock assumptions, sensitivity tables |
| SICI's seven-day averaging masks spot spikes | Timing mismatch | Explain smoothing/lag and run short-term divergence scenarios |
| No accessible historical data | Cannot calibrate hedge ratios/backtest | Use explicit manual assumptions; disable statistical claims |
| Contract/price units misunderstood | Incorrect dollar notionals | Metadata validation, decimal tests, and independent reconciliation |
| LLM hallucinates market conclusions | Dangerous recommendations | Deterministic calculations; structured numbers; no autonomously signed trades |
| Regulatory/geographic restrictions | Trading feature may be unsuitable/unavailable | Simulation-only MVP; legal review before real transactions |
| Ten-day schedule slips | Weak demo | Day 5 hard milestone and scope-cut strategy |

## 16. Go / no-go checkpoints

**Before development:** confirm SICI market metadata available through official API, source and precise quote conventions, and one feasible read path. If not, adapt product to cost-risk analytics while clearly explaining the deferred onchain integration.

**Before Demo Day:** all calculations pass tests; one coherent user flow works; every visible “live” number can be traced to Injective with a timestamp; network failures are handled; no real money can be traded through the application.

**Before shipping live trading (post-MVP):** obtain security review, exchange-specific accounting tests, execution/slippage model, jurisdiction analysis, explicit user consent, margin controls, and rollback / incident plan.

## 17. Business model and validation

**Potential model (hypothesis, not forecast):** free basic exposure dashboard; paid workspace for teams with billing connectors, saved portfolios, risk alerts and compliance-grade export; possible enterprise API. Do not introduce a token for the MVP.

**First discovery interviews:** 5–10 AI infrastructure operators or startup founders. Ask for budget process, variable GPU spend, existing fixed-price contracts, who owns hedging decisions, and whether they would pay for a risk dashboard without automated trade execution.

**Validation questions:** Does this solve a real budgeting problem? Would users trust an index hedge with nontrivial basis risk? Are hedging instruments sufficiently liquid? Is the realistic buyer an AI startup, a GPU provider, or a financial risk desk?

## 18. Open decisions

1. Which data endpoint exposes a stable, correctly normalized SICI market history?
2. Are public liquidity and funding observations sufficient to support meaningful analysis?
3. Can licensed provider-specific GPU rate data be used for empirical calibration?
4. Do target users want cost monitoring, actual hedging, or both?
5. Does Injective provide access to SICI options for a later prototype?
6. What legal constraints apply to a future real-execution interface in each target geography?
7. What should trigger a pivot if economic hedging is not commercially viable? Recommended fallback: **GPU cost intelligence and risk alerts**, retaining Injective as an optional market reference.

## 19. Definitions of done

### MVP is done when

- [ ] Workload profile accepts and validates multiple GPU rows.
- [ ] Baseline compute budget and 3+ scenarios are correct and reproducible.
- [ ] SICI current market data is genuinely integrated **or** clearly marked unavailable with demo fallback.
- [ ] Hedge Lab compares no hedge vs at least two user-adjustable simulations.
- [ ] All assumptions, funding, fees, slippage and basis risk are visible.
- [ ] No feature signs real trades or handles custody.
- [ ] Unit and E2E tests cover the scripted demo.
- [ ] Project runs from README, deploys publicly, and has a concise demo video.
- [ ] Claims about live data, backtests, or savings are substantiated or removed.

### Future definition of real hedge readiness

Quantified effectiveness on representative real usage and market history; executable liquidity and cost model; audited integration; user consent and jurisdiction checks; monitoring and incident response. **This is explicitly not part of the 10-day MVP.**

## 20. Source references (checked November 11, 2026)

1. Injective, *Super Intelligence Compute Index*, October 26, 2026: https://injective.com/blog/super-intelligence-compute-index
2. Injective, *Introducing Onchain Options*, October 27, 2026: https://injective.com/blog/injective-options
3. Injective, *Introducing the Injective Hacker House*, October 28, 2026: https://injective.com/blog/injective-hacker-house
4. Injective Developer Hub: https://injective.com/dev
5. Injective API Reference: https://api.injective.exchange/

**Implementation note:** The P0 application is implemented and verified in the local repository with unit tests, browser-flow tests, a production build, and a live read-only SICI adapter. The public GitHub repository and deployment remain unchanged until the owner explicitly approves a push and deployment. See the repository README for current evidence and limitations.
