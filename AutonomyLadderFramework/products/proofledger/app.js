/* ProofLedger — evidence-based rung promotion */
(function () {
  const { el, table, badge, rungBadge, sampleToolbar, stat, section } = ALF;
  const store = ALF.Store("proofledger");

  const SEED = {
    outcomes: [
      { id: "o1", decisionType: "Glass-claim auto-approval", agent: "claims-fastlane", domain: "Claims", period: "2026-Q2",
        decisions: 3410, correct: 3352, disputed: 41, reversed: 17, avgValue: "€612", quality: 98.3 },
      { id: "o2", decisionType: "Replacement-vehicle order", agent: "claims-fastlane", domain: "Claims", period: "2026-Q2",
        decisions: 1180, correct: 1169, disputed: 8, reversed: 3, avgValue: "€180/day", quality: 99.1 },
      { id: "o3", decisionType: "Renewal premium (motor)", agent: "renewal-pricer", domain: "Underwriting", period: "2026-Q2",
        decisions: 2440, correct: 2262, disputed: 118, reversed: 60, avgValue: "€741", quality: 92.7 },
      { id: "o4", decisionType: "Claim payout release", agent: "payout-runner", domain: "Payments", period: "2026-Q2",
        decisions: 2890, correct: 2879, disputed: 9, reversed: 2, avgValue: "€1,204", quality: 99.6 },
      { id: "o5", decisionType: "Fraud escalation to SIU", agent: "fraud-sentinel", domain: "Fraud", period: "2026-Q2",
        decisions: 420, correct: 337, disputed: 61, reversed: 22, avgValue: "n/a", quality: 80.2 },
      { id: "o6", decisionType: "First-reply drafting", agent: "cs-first-reply", domain: "Customer Service", period: "2026-Q2",
        decisions: 6300, correct: 6112, disputed: 176, reversed: 12, avgValue: "n/a", quality: 97.0 }
    ],
    recommendations: [
      { id: "r1", agent: "payout-runner", current: 2, proposed: 3, confidence: "High",
        basis: "99.6% quality over 2,890 payouts · 2 reversals, both < €300 · dual-check compliance 100% · 2 consecutive quarters above 99% gate",
        status: "submitted to CFO gate (RungGuard RQ-1)" },
      { id: "r2", agent: "claims-fastlane", current: 3, proposed: 3, confidence: "Hold",
        basis: "Quality 98.3% above hold gate but reversal value trending up (+€2.1k QoQ); recommend hold one quarter and re-score",
        status: "hold recommended" },
      { id: "r3", agent: "fraud-sentinel", current: 3, proposed: 2, confidence: "High",
        basis: "80.2% quality; 61 disputes; July 12 false-positive cascade (BreakerKit i1); evidence supports demotion review",
        status: "demotion review opened" }
    ]
  };

  const app = document.getElementById("app");
  app.appendChild(section("Scenario", "Q2 outcome data for six decision types at Northwind Mutual. The scoring model has produced three recommendations: promote payout-runner to Rung 3 (the evidence packet a CFO can actually sign), hold claims-fastlane, and open a demotion review for fraud-sentinel — the same story RungGuard and BreakerKit tell from their angles. Generate the evidence packet to see the board-ready export."));
  const bar = sampleToolbar(store, SEED, render);
  app.appendChild(bar);

  const statsBox = el("div", { class: "stats" }); app.appendChild(statsBox);

  const outPanel = section("Decision–outcome ledger", "Quality = correct ÷ decisions, adjusted for reversal value. Select rows to delete.");
  const outHost = el("div"); outPanel.appendChild(outHost); app.appendChild(outPanel);

  const recPanel = section("Rung recommendations", "Promotion is an evidence-based event, not a committee vote.");
  const recHost = el("div"); recPanel.appendChild(recHost); app.appendChild(recPanel);

  const packPanel = section("Evidence packet", "Board-ready packet for the selected recommendation. Download as JSON for the risk-committee pack.");
  const packBox = el("div", { class: "log" }, [el("span", { class: "t" }, ["— press 'Evidence packet' on a recommendation —"])]);
  packPanel.appendChild(packBox); app.appendChild(packPanel);

  function packet(rec) {
    const rows = store.get("outcomes").filter(o => o.agent === rec.agent);
    const pk = {
      packetId: "PL-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + rec.agent,
      generated: new Date().toISOString(),
      agent: rec.agent, currentRung: rec.current, proposedRung: rec.proposed,
      confidence: rec.confidence, basis: rec.basis,
      supportingOutcomes: rows.map(o => ({
        decisionType: o.decisionType, period: o.period, decisions: o.decisions,
        correct: o.correct, disputed: o.disputed, reversed: o.reversed, qualityPct: o.quality
      })),
      crossReferences: ["RungGuard audit log", "BreakerKit incident log", "AuditRung obligations for target rung"],
      signOffRequired: rec.proposed >= 3 ? "C-suite (Rung 3+ gate)" : "Domain owner"
    };
    packBox.innerHTML = "<pre style='margin:0;white-space:pre-wrap'>" + JSON.stringify(pk, null, 2) + "</pre>";
    const blob = new Blob([JSON.stringify(pk, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = pk.packetId + ".json";
    a.className = "btn small"; a.textContent = "Download packet JSON";
    a.style.display = "inline-block"; a.style.marginTop = "10px";
    packBox.appendChild(a);
  }

  function render() {
    const outcomes = store.get("outcomes"), recs = store.get("recommendations");
    statsBox.innerHTML = "";
    const totalDec = outcomes.reduce((s, o) => s + (o.decisions || 0), 0);
    statsBox.appendChild(stat("Decisions tracked (Q2)", totalDec.toLocaleString()));
    const avgQ = outcomes.length ? (outcomes.reduce((s, o) => s + o.quality, 0) / outcomes.length).toFixed(1) : "—";
    statsBox.appendChild(stat("Avg decision quality", avgQ + "%", avgQ >= 95 ? "good" : "warn"));
    statsBox.appendChild(stat("Promotions recommended", recs.filter(r => r.proposed > r.current).length, "good"));
    statsBox.appendChild(stat("Demotion reviews", recs.filter(r => r.proposed < r.current).length, "crit"));

    outHost.innerHTML = "";
    outHost.appendChild(table(outcomes, [
      { key: "decisionType", label: "Decision type" },
      { key: "agent", label: "Agent" },
      { key: "domain", label: "Domain", render: r => badge(r.domain, "info") },
      { key: "period", label: "Period" },
      { key: "decisions", label: "Decisions", render: r => r.decisions.toLocaleString() },
      { key: "correct", label: "Correct" },
      { key: "disputed", label: "Disputed" },
      { key: "reversed", label: "Reversed" },
      { key: "quality", label: "Quality", render: r => {
          const g = el("div", { style: "min-width:110px" });
          g.appendChild(el("div", {}, [r.quality + "%"]));
          const gg = el("div", { class: "gauge" }); gg.appendChild(el("div", { style: "width:" + r.quality + "%" }));
          g.appendChild(gg); return g;
        } }
    ], { onDelete: ids => { store.removeByIds("outcomes", ids); bar.refresh(); render(); } }));

    recHost.innerHTML = "";
    recHost.appendChild(table(recs, [
      { key: "agent", label: "Agent" },
      { key: "move", label: "Rung", render: r => el("span", {}, [rungBadge(r.current), el("span", { style: "margin:0 6px" }, ["→"]), rungBadge(r.proposed)]) },
      { key: "confidence", label: "Confidence", render: r => badge(r.confidence, r.confidence === "High" ? "ok" : "warn") },
      { key: "basis", label: "Evidence basis" },
      { key: "status", label: "Status" },
      { key: "pk", label: "", render: r => el("button", { class: "btn small ghost", onclick: () => packet(r) }, ["Evidence packet"]) }
    ], { onDelete: ids => { store.removeByIds("recommendations", ids); bar.refresh(); render(); } }));
  }

  store.seed(SEED);
  render();
})();
