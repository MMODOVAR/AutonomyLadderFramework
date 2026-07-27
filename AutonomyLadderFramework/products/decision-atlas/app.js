/* Decision Atlas — enterprise decision inventory */
(function () {
  const { el, table, badge, rungBadge, sampleToolbar, stat, section } = ALF;
  const store = ALF.Store("decision-atlas");

  // Rung recommendation from the three placement criteria (1 low risk … 5 high risk)
  function recommendRung(d) {
    const risk = (6 - d.reversibility) + (6 - d.clarity) + d.blast; // 3..15, higher = riskier
    if (risk <= 5) return 4; if (risk <= 7) return 3; if (risk <= 9) return 2; if (risk <= 11) return 1; return 0;
  }

  const SEED = { decisions: [
    { id: "d1", name: "Auto-approve glass-damage claims < €1,000", domain: "Claims", owner: "L. Bianchi (Head of Claims)",
      data: "Policy DB, photo evidence, repair-shop invoices", correct: "Claim within coverage, invoice matches damage class, no fraud flag",
      reversibility: 4, clarity: 5, blast: 2, volume: 1240, targetRung: null },
    { id: "d2", name: "Set renewal premium for motor policies", domain: "Underwriting", owner: "S. Conti (Chief Underwriter)",
      data: "Claims history, telematics, actuarial tables", correct: "Within actuarial band ±3%, regulator-filed rate plan respected",
      reversibility: 3, clarity: 4, blast: 4, volume: 860, targetRung: null },
    { id: "d3", name: "Release claim payout to customer bank account", domain: "Payments", owner: "M. Greco (Finance Ops)",
      data: "Approved claim record, IBAN verification, sanctions list", correct: "Approved claim exists, IBAN verified, sanctions clear",
      reversibility: 1, clarity: 5, blast: 4, volume: 990, targetRung: null },
    { id: "d4", name: "Escalate suspected fraud to SIU", domain: "Fraud", owner: "P. Ricci (SIU Lead)",
      data: "Anomaly score, claim network graph, prior SIU cases", correct: "Score > threshold OR network link to confirmed fraud ring",
      reversibility: 5, clarity: 3, blast: 2, volume: 140, targetRung: null },
    { id: "d5", name: "Draft first response to customer complaint", domain: "Customer Service", owner: "A. Fontana (CS Director)",
      data: "Case history, policy terms, tone guidelines", correct: "Factually consistent with case file; approved tone; no commitments made",
      reversibility: 5, clarity: 4, blast: 1, volume: 2100, targetRung: null },
    { id: "d6", name: "Decline non-standard commercial property risk", domain: "Underwriting", owner: "S. Conti (Chief Underwriter)",
      data: "Survey report, cat-model output, appetite statement", correct: "Judgment-heavy: appetite fit is contested between teams",
      reversibility: 2, clarity: 2, blast: 5, volume: 35, targetRung: null },
    { id: "d7", name: "Order replacement vehicle for covered breakdown", domain: "Claims", owner: "L. Bianchi (Head of Claims)",
      data: "Coverage check, partner-garage availability, cost table", correct: "Coverage active, cost < daily cap, partner confirmed",
      reversibility: 3, clarity: 5, blast: 1, volume: 410, targetRung: null },
    { id: "d8", name: "Block card payments on suspected account takeover", domain: "Fraud", owner: "P. Ricci (SIU Lead)",
      data: "Login anomalies, device fingerprint, velocity rules", correct: "Two independent signals; customer contactable for verification",
      reversibility: 4, clarity: 3, blast: 3, volume: 75, targetRung: null }
  ]};

  const app = document.getElementById("app");
  const scen = section("Scenario", "Northwind Mutual has commissioned its Phase 0 Decision Inventory. Eight significant decisions have been discovered across five domains; each is scored on the three placement criteria (reversibility, decision clarity, blast radius — 1 to 5) and receives a recommended autonomy rung. Domain owners can override the target rung; overrides are how the board decision map gets approved.");
  app.appendChild(scen);

  const bar = sampleToolbar(store, SEED, render);
  app.appendChild(bar);

  const statsBox = el("div", { class: "stats" });
  app.appendChild(statsBox);

  const invPanel = section("Decision inventory", "Select rows to delete them (sample rows are marked). Use the target-rung selector to record the domain owner's placement.");
  const tableHost = el("div");
  invPanel.appendChild(tableHost);
  app.appendChild(invPanel);

  const addPanel = section("Add a decision", "Captured decisions join the inventory alongside the sample scenario and survive sample-data removal.");
  const f = {};
  const rowEl = el("div", { class: "row" });
  [["name", "Decision"], ["domain", "Domain"], ["owner", "Owner"]].forEach(([k, lab]) => {
    const d = el("div"); d.appendChild(el("label", { class: "f" }, [lab]));
    f[k] = el("input", { type: "text" }); d.appendChild(f[k]); rowEl.appendChild(d);
  });
  addPanel.appendChild(rowEl);
  const rowEl2 = el("div", { class: "row" });
  [["reversibility", "Reversibility (1–5)"], ["clarity", "Decision clarity (1–5)"], ["blast", "Blast radius (1–5)"]].forEach(([k, lab]) => {
    const d = el("div"); d.appendChild(el("label", { class: "f" }, [lab]));
    f[k] = el("select");
    [1,2,3,4,5].forEach(n => f[k].appendChild(el("option", { value: String(n) }, [String(n)])));
    f[k].value = "3"; d.appendChild(f[k]); rowEl2.appendChild(d);
  });
  addPanel.appendChild(rowEl2);
  addPanel.appendChild(el("div", { style: "margin-top:12px" }, [
    el("button", { class: "btn", onclick: () => {
      if (!f.name.value.trim()) return alert("Give the decision a name.");
      store.add("decisions", {
        name: f.name.value, domain: f.domain.value || "Unassigned", owner: f.owner.value || "—",
        data: "—", correct: "—", volume: 0, targetRung: null,
        reversibility: +f.reversibility.value, clarity: +f.clarity.value, blast: +f.blast.value
      });
      f.name.value = f.domain.value = f.owner.value = "";
      render();
    }}, ["Add to inventory"])
  ]));
  app.appendChild(addPanel);

  function render() {
    const decisions = store.get("decisions");
    statsBox.innerHTML = "";
    const domains = new Set(decisions.map(d => d.domain));
    const r3plus = decisions.filter(d => (d.targetRung != null ? d.targetRung : recommendRung(d)) >= 3).length;
    const approved = decisions.filter(d => d.targetRung != null).length;
    statsBox.appendChild(stat("Decisions mapped", decisions.length));
    statsBox.appendChild(stat("Domains covered", domains.size));
    statsBox.appendChild(stat("Candidates at Rung 3+", r3plus, "warn"));
    statsBox.appendChild(stat("Owner-approved placements", approved, approved === decisions.length && decisions.length ? "good" : ""));

    tableHost.innerHTML = "";
    tableHost.appendChild(table(decisions, [
      { key: "name", label: "Decision" },
      { key: "domain", label: "Domain", render: r => badge(r.domain, "info") },
      { key: "owner", label: "Owner" },
      { key: "data", label: "Data feeds" },
      { key: "correct", label: "What 'correct' looks like" },
      { key: "scores", label: "Rev / Clar / Blast", render: r => r.reversibility + " / " + r.clarity + " / " + r.blast },
      { key: "volume", label: "Decisions / mo" },
      { key: "rec", label: "Recommended", render: r => rungBadge(recommendRung(r)) },
      { key: "targetRung", label: "Owner target", render: r => {
          const sel = el("select");
          sel.appendChild(el("option", { value: "" }, ["— pending —"]));
          ALF.RUNG_LABELS.forEach((lab, i) => sel.appendChild(el("option", { value: String(i) }, [lab])));
          sel.value = r.targetRung == null ? "" : String(r.targetRung);
          sel.addEventListener("change", () => {
            store.update("decisions", r.id, { targetRung: sel.value === "" ? null : +sel.value });
            render();
          });
          return sel;
        } }
    ], { onDelete: ids => { store.removeByIds("decisions", ids); bar.refresh(); render(); } }));
  }

  store.seed(SEED);
  render();
})();
