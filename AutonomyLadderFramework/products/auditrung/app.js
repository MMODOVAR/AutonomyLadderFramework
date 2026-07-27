/* AuditRung — rung-aware compliance automation */
(function () {
  const { el, table, badge, rungBadge, sampleToolbar, stat, section } = ALF;
  const store = ALF.Store("auditrung");

  const SEED = {
    obligations: [
      { id: "ob1", rung: 3, domain: "Payments", jurisdiction: "EU", regime: "EU AI Act (high-risk)", obligation: "Human oversight design + logging of every autonomous payout decision", evidence: "collected", trigger: "Activated by payout-runner R2→R3 request" },
      { id: "ob2", rung: 3, domain: "Payments", jurisdiction: "EU", regime: "GDPR Art. 22", obligation: "Right to human review of automated decisions affecting the data subject", evidence: "collected", trigger: "Activated by payout-runner R2→R3 request" },
      { id: "ob3", rung: 3, domain: "Claims", jurisdiction: "EU", regime: "EU AI Act (high-risk)", obligation: "Conformity assessment + technical documentation for claims auto-approval", evidence: "partial", trigger: "Active since claims-fastlane at R3" },
      { id: "ob4", rung: 3, domain: "Claims", jurisdiction: "EU", regime: "IVASS Reg. 44 (IT)", obligation: "Explainability record for each automated claim outcome, retained 5y", evidence: "collected", trigger: "Active since claims-fastlane at R3" },
      { id: "ob5", rung: 2, domain: "Underwriting", jurisdiction: "EU", regime: "Solvency II / actuarial governance", obligation: "Human sign-off recorded on every bound premium; model change log", evidence: "collected", trigger: "Standing at R2" },
      { id: "ob6", rung: 4, domain: "Fraud", jurisdiction: "EU", regime: "EU AI Act + GDPR", obligation: "DPIA + bias audit for fully-autonomous blocking (R4)", evidence: "lapsed", trigger: "Deactivated on 2026-07-12 demotion R4→R3 — retained for audit trail" },
      { id: "ob7", rung: 1, domain: "Customer Service", jurisdiction: "EU", regime: "GDPR minimisation", obligation: "Draft-only agent must not persist customer PII outside case system", evidence: "collected", trigger: "Standing at R1" },
      { id: "ob8", rung: 3, domain: "Payments", jurisdiction: "UK", regime: "FCA SYSC / Consumer Duty", obligation: "Outcome-fairness monitoring for automated payouts to UK policyholders", evidence: "missing", trigger: "Will activate if UK book included in R3 scope" }
    ]
  };

  const app = document.getElementById("app");
  app.appendChild(section("Scenario", "Northwind Mutual's compliance posture, rung-aware. When payout-runner's Rung 3 request entered RungGuard, two EU obligations auto-activated (ob1, ob2). When fraud-sentinel was demoted from Rung 4, its R4 obligations deactivated but stayed on the trail (ob6). One obligation is missing evidence — the UK fairness monitoring that would trigger if the UK book joins the Rung 3 scope. Filter by rung or jurisdiction, then export the audit package."));
  const bar = sampleToolbar(store, SEED, render);
  app.appendChild(bar);

  const statsBox = el("div", { class: "stats" }); app.appendChild(statsBox);

  const filterPanel = section("Obligation register", "Every obligation binds to rung × domain × jurisdiction. Rung changes are compliance events: promotions activate obligations, demotions retire them onto the audit trail.");
  const filters = el("div", { class: "row", style: "margin-bottom:10px" });
  const rungSel = el("select"), jurSel = el("select"), evSel = el("select");
  rungSel.appendChild(el("option", { value: "" }, ["All rungs"]));
  [0, 1, 2, 3, 4].forEach(r => rungSel.appendChild(el("option", { value: String(r) }, ["Rung " + r])));
  ["", "EU", "UK"].forEach(j => jurSel.appendChild(el("option", { value: j }, [j || "All jurisdictions"])));
  ["", "collected", "partial", "missing", "lapsed"].forEach(s => evSel.appendChild(el("option", { value: s }, [s || "All evidence states"])));
  [["Rung", rungSel], ["Jurisdiction", jurSel], ["Evidence", evSel]].forEach(([lab, node]) => {
    const d = el("div"); d.appendChild(el("label", { class: "f" }, [lab])); d.appendChild(node); filters.appendChild(d);
  });
  [rungSel, jurSel, evSel].forEach(s => s.addEventListener("change", render));
  filterPanel.appendChild(filters);
  const obHost = el("div"); filterPanel.appendChild(obHost); app.appendChild(filterPanel);

  const exPanel = section("Audit export", "Generates the evidence package internal audit or the regulator will ask for — scoped to the current filter.");
  const exBox = el("div", { class: "log" }, [el("span", { class: "t" }, ["— press Generate audit package —"])]);
  exPanel.appendChild(el("div", { style: "margin-bottom:10px" }, [
    el("button", { class: "btn", onclick: exportPack }, ["Generate audit package"])
  ]));
  exPanel.appendChild(exBox); app.appendChild(exPanel);

  function filtered() {
    return store.get("obligations").filter(o =>
      (rungSel.value === "" || o.rung === +rungSel.value) &&
      (jurSel.value === "" || o.jurisdiction === jurSel.value) &&
      (evSel.value === "" || o.evidence === evSel.value));
  }

  function exportPack() {
    const rows = filtered();
    const pack = {
      packageId: "AR-" + Date.now().toString(36).toUpperCase(),
      generated: new Date().toISOString(),
      scope: { rung: rungSel.value || "all", jurisdiction: jurSel.value || "all", evidence: evSel.value || "all" },
      obligations: rows.map(o => ({ regime: o.regime, rung: o.rung, domain: o.domain, jurisdiction: o.jurisdiction, obligation: o.obligation, evidenceStatus: o.evidence, activationTrigger: o.trigger })),
      attestations: { collected: rows.filter(o => o.evidence === "collected").length, gaps: rows.filter(o => o.evidence === "missing" || o.evidence === "partial").length },
      crossReferences: ["RungGuard rung-tagged audit log", "ProofLedger evidence packets", "BreakerKit incident log"]
    };
    exBox.innerHTML = "<pre style='margin:0;white-space:pre-wrap'>" + JSON.stringify(pack, null, 2) + "</pre>";
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = pack.packageId + ".json";
    a.className = "btn small"; a.textContent = "Download package JSON";
    a.style.display = "inline-block"; a.style.marginTop = "10px";
    exBox.appendChild(a);
  }

  function evBadge(s) {
    return badge(s.toUpperCase(), s === "collected" ? "ok" : s === "partial" ? "warn" : s === "lapsed" ? "neutral" : "crit");
  }

  function render() {
    const all = store.get("obligations"), rows = filtered();
    statsBox.innerHTML = "";
    statsBox.appendChild(stat("Obligations tracked", all.length));
    statsBox.appendChild(stat("Evidence collected", all.filter(o => o.evidence === "collected").length, "good"));
    statsBox.appendChild(stat("Gaps (partial/missing)", all.filter(o => o.evidence === "partial" || o.evidence === "missing").length, "crit"));
    statsBox.appendChild(stat("Rung-triggered activations", all.filter(o => (o.trigger || "").startsWith("Activated")).length, "warn"));

    obHost.innerHTML = "";
    obHost.appendChild(table(rows, [
      { key: "regime", label: "Regime" },
      { key: "rung", label: "Rung", render: r => rungBadge(r.rung) },
      { key: "domain", label: "Domain", render: r => badge(r.domain, "info") },
      { key: "jurisdiction", label: "Jurisdiction", render: r => badge(r.jurisdiction, "neutral") },
      { key: "obligation", label: "Obligation" },
      { key: "trigger", label: "Activation trigger" },
      { key: "evidence", label: "Evidence", render: r => evBadge(r.evidence) }
    ], { onDelete: ids => { store.removeByIds("obligations", ids); bar.refresh(); render(); } }));
  }

  store.seed(SEED);
  render();
})();
