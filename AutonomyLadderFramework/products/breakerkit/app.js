/* BreakerKit — error architecture: breakers, drift, rollback, incidents */
(function () {
  const { el, table, badge, sampleToolbar, stat, section } = ALF;
  const store = ALF.Store("breakerkit");

  const SEED = {
    breakers: [
      { id: "b1", name: "claims-value-cap", domain: "Claims", metric: "€ approved / hour", threshold: "> €40,000/h", state: "closed", trips30d: 1 },
      { id: "b2", name: "payout-velocity", domain: "Payments", metric: "payouts / minute", threshold: "> 12/min", state: "closed", trips30d: 0 },
      { id: "b3", name: "uw-quote-drift", domain: "Underwriting", metric: "semantic drift score", threshold: "> 0.35", state: "open", trips30d: 3 },
      { id: "b4", name: "cs-tone-guard", domain: "Customer Service", metric: "policy-violation rate", threshold: "> 2%", state: "closed", trips30d: 0 },
      { id: "b5", name: "fraud-fp-cascade", domain: "Fraud", metric: "false-positive blocks / hour", threshold: "> 8/h", state: "half-open", trips30d: 2 }
    ],
    playbooks: [
      { id: "p1", name: "Reverse erroneous payouts (bulk)", domain: "Payments", steps: "Freeze queue → identify window → issue recall via SEPA recall API → notify customers → reconcile", lastRehearsed: "2026-06-30", rto: "4h" },
      { id: "p2", name: "Reprice mis-quoted renewals", domain: "Underwriting", steps: "Snapshot quotes → diff vs actuarial band → regenerate letters → regulator notification if > 100 policies", lastRehearsed: "2026-05-15", rto: "24h" },
      { id: "p3", name: "Unblock wrongly-flagged accounts", domain: "Fraud", steps: "Pull block list for window → SIU triage → staged unblock → customer apology comms", lastRehearsed: "2026-07-10", rto: "2h" }
    ],
    incidents: [
      { id: "i1", ts: "2026-07-12 13:55", agent: "fraud-sentinel", cls: "Bad bounds", desc: "False-positive cascade blocked 214 accounts in 40 min; fraud-fp-cascade breaker tripped; playbook p3 executed; RungGuard demotion R4→R3", status: "resolved" },
      { id: "i2", ts: "2026-07-03 11:20", agent: "renewal-pricer", cls: "Bad data", desc: "Stale actuarial table caused drift score 0.41; uw-quote-drift breaker opened; 38 quotes withheld pre-send", status: "resolved" },
      { id: "i3", ts: "2026-07-25 08:22", agent: "renewal-pricer", cls: "Bad decision", desc: "Drift recurrence under investigation; breaker held open pending root cause", status: "open" }
    ]
  };

  const app = document.getElementById("app");
  app.appendChild(section("Scenario", "Northwind Mutual's error architecture in operation. Five breakers guard the five domains — uw-quote-drift is currently open after a drift recurrence, and fraud-fp-cascade is half-open recovering from the July 12 cascade (the incident that demoted fraud-sentinel in RungGuard). Run the traffic simulator to watch a breaker trip at machine speed, then reset it."));
  const bar = sampleToolbar(store, SEED, render);
  app.appendChild(bar);

  const statsBox = el("div", { class: "stats" }); app.appendChild(statsBox);

  const brPanel = section("Circuit breakers", "closed = healthy · open = tripped, traffic halted · half-open = probing recovery.");
  const brHost = el("div"); brPanel.appendChild(brHost); app.appendChild(brPanel);

  const simPanel = section("Machine-speed failure simulator", "Simulates a burst of agent decisions against the payout-velocity breaker. Watch the breaker trip faster than any human could react — that is the point.");
  const logBox = el("div", { class: "log" }, [el("span", { class: "t" }, ["— press Run simulation —"])]);
  simPanel.appendChild(el("div", { style: "margin-bottom:10px" }, [
    el("button", { class: "btn", onclick: simulate }, ["Run simulation"])
  ]));
  simPanel.appendChild(logBox); app.appendChild(simPanel);

  const pbPanel = section("Rollback playbooks", "Written, rehearsed, scoped per decision type. RTO = target time to unwind.");
  const pbHost = el("div"); pbPanel.appendChild(pbHost); app.appendChild(pbPanel);

  const incPanel = section("Incident log (agent-specific taxonomy)", "Classes: Bad decision · Bad data · Bad delegation · Bad bounds.");
  const incHost = el("div"); incPanel.appendChild(incHost); app.appendChild(incPanel);

  function simulate() {
    const b = store.get("breakers").find(x => x.name === "payout-velocity");
    if (!b) { logBox.innerHTML = "<span class='warn'>payout-velocity breaker not found — load the sample scenario first.</span>"; return; }
    const lines = []; let rate = 4; let t = 0; let tripped = false;
    const timer = setInterval(() => {
      t += 1; rate = Math.round(rate * (1.45 + Math.random() * 0.2));
      if (!tripped) {
        lines.push("<span class='t'>[t+" + t + "s]</span> agent payout-runner issuing " + rate + " payouts/min");
        if (rate > 12) {
          tripped = true;
          lines.push("<span class='crit'>[t+" + t + "s] THRESHOLD BREACH (" + rate + "/min > 12/min) — breaker payout-velocity OPEN in 180ms</span>");
          lines.push("<span class='crit'>[t+" + t + "s] traffic halted · queue frozen · Payments on-call paged · RungGuard notified</span>");
          lines.push("<span class='ok'>[t+" + (t + 1) + "s] rollback playbook 'Reverse erroneous payouts (bulk)' pre-armed (RTO 4h)</span>");
          store.update("breakers", b.id, { state: "open", trips30d: (b.trips30d || 0) + 1 });
          render();
          clearInterval(timer);
        }
      }
      logBox.innerHTML = lines.join("<br>"); logBox.scrollTop = logBox.scrollHeight;
      if (t > 12) clearInterval(timer);
    }, 450);
  }

  function render() {
    const breakers = store.get("breakers"), playbooks = store.get("playbooks"), incidents = store.get("incidents");
    statsBox.innerHTML = "";
    statsBox.appendChild(stat("Breakers deployed", breakers.length));
    const open = breakers.filter(b => b.state !== "closed").length;
    statsBox.appendChild(stat("Open / half-open", open, open ? "crit" : "good"));
    statsBox.appendChild(stat("Playbooks rehearsed", playbooks.length, "good"));
    statsBox.appendChild(stat("Open incidents", incidents.filter(i => i.status === "open").length, incidents.some(i => i.status === "open") ? "warn" : "good"));

    brHost.innerHTML = "";
    brHost.appendChild(table(breakers, [
      { key: "name", label: "Breaker" },
      { key: "domain", label: "Domain", render: r => badge(r.domain, "info") },
      { key: "metric", label: "Watched metric" },
      { key: "threshold", label: "Trip condition" },
      { key: "state", label: "State", render: r => badge(r.state.toUpperCase(), r.state === "closed" ? "ok" : r.state === "open" ? "crit" : "warn") },
      { key: "trips30d", label: "Trips (30d)" },
      { key: "act", label: "", render: r => r.state === "closed" ? el("span") :
          el("button", { class: "btn small ghost", onclick: () => { store.update("breakers", r.id, { state: "closed" }); render(); } }, ["Reset to closed"]) }
    ], { onDelete: ids => { store.removeByIds("breakers", ids); bar.refresh(); render(); } }));

    pbHost.innerHTML = "";
    pbHost.appendChild(table(playbooks, [
      { key: "name", label: "Playbook" },
      { key: "domain", label: "Domain", render: r => badge(r.domain, "info") },
      { key: "steps", label: "Steps" },
      { key: "lastRehearsed", label: "Last rehearsed" },
      { key: "rto", label: "RTO" }
    ], { onDelete: ids => { store.removeByIds("playbooks", ids); bar.refresh(); render(); } }));

    incHost.innerHTML = "";
    incHost.appendChild(table(incidents, [
      { key: "ts", label: "When" },
      { key: "agent", label: "Agent" },
      { key: "cls", label: "Class", render: r => badge(r.cls, r.cls === "Bad bounds" ? "crit" : r.cls === "Bad data" ? "warn" : "info") },
      { key: "desc", label: "What happened" },
      { key: "status", label: "Status", render: r => badge(r.status, r.status === "resolved" ? "ok" : "warn") }
    ], { onDelete: ids => { store.removeByIds("incidents", ids); bar.refresh(); render(); } }));
  }

  store.seed(SEED);
  render();
})();
