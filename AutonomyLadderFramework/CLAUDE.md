# CLAUDE.md — project guide for Claude Code

## What this is
Reference implementation of the eight products of the Agentic Enterprise Transformation framework
(the "Autonomy Ladder Platform"). Pure static HTML/CSS/JS — **no build step, no dependencies, no framework**.
Keep it that way unless the user explicitly asks to migrate.

## Architecture rules
- Each product lives in `products/<name>/` with an `index.html` shell and an `app.js` (IIFE) containing
  its logic **and** its demo scenario in a `SEED` object.
- Shared code only in `assets/`: `store.js` (state + sample-data lifecycle) and `ui.js` (components).
  Do not duplicate table/badge/toolbar logic inside products — extend `ui.js` instead.
- State: `ALF.Store(productKey)` over localStorage. Collections are named arrays of records with `id`.
  Sample records carry `_sample: true`; user-created records must never get that flag.

## Sample-data contract (must hold for every product, present and future)
1. Auto-seed the full scenario on first visit (`store.seed(SEED)` at the bottom of app.js).
2. Render `ALF.sampleToolbar(store, SEED, render)` near the top: load/reload + remove-all-samples.
3. Every table is selectable with per-row delete via the `onDelete` option.
4. "Remove all sample data" must preserve user-created records.
5. The scenario is Northwind Mutual Insurance (fictional). Keep new sample data consistent with the
   existing cross-product story (agents: claims-fastlane, renewal-pricer, payout-runner, cs-first-reply,
   fraud-sentinel; domains: Claims, Underwriting, Payments, Customer Service, Fraud; the July 12
   fraud-sentinel demotion is referenced in RungGuard, BreakerKit, ProofLedger and AuditRung).

## Domain concepts (do not drift from these)
- Autonomy Ladder rungs: R0 Human-Led, R1 AI-Assisted, R2 Human-in-the-Loop, R3 Bounded Autonomy,
  R4 Fully Autonomous. Rung 3+ changes require the C-suite gate.
- Placement criteria: reversibility, decision clarity, blast radius.
- Demotion must expire credentials immediately (RungGuard behaviour is normative).
- Cross-domain access is deny-by-default (DomainGate behaviour is normative).
- "Context is local, events are global" (ContextStream).

## Conventions
- Vanilla JS, no semicolonless style, no TypeScript, 2-space indent.
- New UI states use the existing CSS variables/badge classes in `assets/styles.css`.
- Test by opening `index.html` directly (file://) — everything must work without a server.
- Validate JS with `node --check products/<name>/app.js` before finishing.

## Backlog candidates
- Decision-graph visualisation (SVG) in Decision Atlas.
- Export/import of full platform state as one JSON file.
- A ninth module: Ladder Governance Retainer dashboard (quarterly rung reviews).
- Optional JSON-file backend (node, no deps) replacing localStorage behind the same Store API.
