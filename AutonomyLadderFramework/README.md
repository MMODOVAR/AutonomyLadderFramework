# Autonomy Ladder Framework — Product Suite

Reference implementation of the eight products from the **Agentic Enterprise Transformation** framework
(Decision Inventory → Autonomy Ladder → Error Architecture → Graduated Autonomy).

Zero-build, dependency-free web apps: clone and open `index.html`, or serve the folder with any static server.

```bash
# option 1 — just open it
open index.html            # macOS   (Windows: start index.html)

# option 2 — serve it
npx serve .                # or: python3 -m http.server 8080
```

## The eight products

| Phase | Product | What the demo showcases |
|---|---|---|
| 0 | **Decision Atlas** | Northwind Mutual's decision inventory: 8 decisions across 5 domains, scored on reversibility / clarity / blast radius, with recommended rungs and owner-approved targets |
| 0 | **Readiness Radar** | Pillar assessment scoring 4 organisations into the 60/30/10 segments with prescribed paths; run your own assessment |
| 1 | **DomainGate** | 4 generated MCP servers (one per bounded context), deny-by-default cross-domain policy with 3 explicit grants, and an access simulator |
| 1 | **ContextStream** | One day of agent-context events with schema registry, 3 narrative-consistency flags (stale address, late fraud signal, schema drift) and audit replay |
| 2 | **RungGuard** | 5 governed agents, credential auto-expiry on demotion (see `fraud-sentinel`), Rung 3 promotion pending at the CFO gate, rung-tagged audit log; promote/demote live |
| 2 | **BreakerKit** | 5 circuit breakers (one open, one half-open), machine-speed trip simulator, rehearsed rollback playbooks, agent-specific incident taxonomy |
| 3 | **ProofLedger** | Q2 decision–outcome ledger (16k+ decisions), quality scores, promotion / hold / demotion recommendations, downloadable evidence packets |
| 3 | **AuditRung** | Obligations mapped rung × domain × jurisdiction, rung-change-triggered activations, evidence status, downloadable audit package |

The scenario is deliberately **cross-referenced**: the fraud-sentinel demotion appears in RungGuard (credential expiry),
BreakerKit (the incident that caused it), ProofLedger (the evidence supporting it) and AuditRung (the lapsed R4 obligations).

## Sample data lifecycle (every product)

- Products **auto-seed** the full demo scenario on first visit — everything runs by default.
- The **sample bar** at the top of each product shows how many sample records are loaded, with
  **Load / Reload sample scenario** and **Remove all sample data**.
- Every table supports **row selection**: tick individual sample (or your own) records and **Delete selected**.
- Sample records are tagged `SAMPLE`; records you create yourself survive "Remove all sample data".
- State persists in `localStorage` per product (`alf:<product>` keys). Clear browser storage for a factory reset.

## Repository layout

```
index.html               launcher / product catalogue
assets/
  styles.css             shared design system
  store.js               localStorage store + sample-data lifecycle (seed / clear / remove-by-id)
  ui.js                  shared components (selectable tables, badges, sample bar, stats)
products/<name>/
  index.html             page shell
  app.js                 product logic + embedded demo scenario (SEED)
```

## Extending with Claude Code

This repo ships with a `CLAUDE.md` so you can continue development with Claude Code:

```bash
cd AutonomyLadderFramework
claude
```

Good first prompts: "add a decision-graph visualisation to Decision Atlas",
"persist RungGuard state to a JSON API instead of localStorage",
"add a ninth product page for the Ladder Governance Retainer dashboard".
