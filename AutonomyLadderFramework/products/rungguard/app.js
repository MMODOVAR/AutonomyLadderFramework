/* RungGuard — rung-native governance control plane */
(function () {
  const { el, table, badge, rungBadge, sampleToolbar, stat, section } = ALF;
  const store = ALF.Store("rungguard");

  function now() { return new Date().toISOString().slice(0, 19).replace("T", " "); }

  const SEED = {
    agents: [
      { id: "ag1", name: "claims-fastlane", domain: "Claims", rung: 3, credential: "svc-claims-fl-2026Q3", credStatus: "active", blast: "≤ €1,000 per decision · ≤ 200 decisions/day", owner: "L. Bianchi" },
      { id: "ag2", name: "renewal-pricer", domain: "Underwriting", rung: 2, credential: "svc-uw-rp-2026Q3", credStatus: "active", blast: "quote only · human binds", owner: "S. Conti" },
      { id: "ag3", name: "payout-runner", domain: "Payments", rung: 2, credential: "svc-pay-run-2026Q3", credStatus: "active", blast: "≤ €5,000 per payout · dual-check > €2,000", owner: "M. Greco" },
      { id: "ag4", name: "cs-first-reply", domain: "Customer Service", rung: 1, credential: "svc-cs-fr-2026Q3", credStatus: "active", blast: "draft only · no send authority", owner: "A. Fontana" },
      { id: "ag5", name: "fraud-sentinel", domain: "Fraud", rung: 3, credential: "EXPIRED (demoted 2026-07-12)", credStatus: "expired", blast: "flag only since demotion", owner: "P. Ricci", pendingNote: "Re-promotion request pending evidence from ProofLedger" }
    ],
    requests: [
      { id: "rq1", agent: "payout-runner", from: 2, to: 3, requestedBy: "M. Greco", date: "2026-07-20", status: "pending", approver: "CFO (Rung 3 gate)", evidence: "ProofLedger packet PL-2026-071 attached" },
      { id: "rq2", agent: "cs-first-reply", from: 1, to: 2, requestedBy: "A. Fontana", date: "2026-07-18", status: "approved", approver: "A. Fontana (domain gate)", evidence: "90-day draft-quality review" }
    ],
    audit: [
      { id: "au1", ts: "2026-07-12 14:03:11", agent: "fraud-sentinel", rungAt: 4, action: "DEMOTION R4→R3 executed after false-positive cascade; credential svc-fraud-sent-2026Q2 auto-expired in 41s", actor: "RungGuard policy engine" },
      { id: "au2", ts: "2026-07-18 09:30:00", agent: "cs-first-reply", rungAt: 1, action: "Promotion R1→R2 approved at domain gate", actor: "A. Fontana" },
      { id: "au3", ts: "2026-07-20 16:12:45", agent: "payout-runner", rungAt: 2, action: "Promotion R2→R3 requested; routed to CFO approval chain (Rung 3+ gate)", actor: "M. Greco" },
      { id: "au4", ts: "2026-07-24 09:14:02", agent: "claims-fastlane", rungAt: 3, action: "Decision executed: approve CLM-88412 (€940) — within blast policy", actor: "agent" }
    ]
  };

  const app = document.getElementById("app");
  app.appendChild(section("Scenario", "Five Northwind Mutual agents under governance. fraud-sentinel was demoted from Rung 4 after a false-positive cascade — note its credential auto-expired 41 seconds after demotion, exactly as the framework requires. A Rung 3 promotion for payout-runner is waiting at the CFO gate. Promote or demote any agent below: demotions expire credentials instantly and every action lands in the rung-tagged audit log."));
  const bar = sampleToolbar(store, SEED, render);
  app.appendChild(bar);

  const statsBox = el("div", { class: "stats" }); app.appendChild(statsBox);

  const agPanel = section("Agents under governance", "Every agent carries its rung, blast-radius policy, and credential state. Promote routes through the approval gate; Demote executes immediately and expires the credential.");
  const agHost = el("div"); agPanel.appendChild(agHost); app.appendChild(agPanel);

  const rqPanel = section("Promotion / demotion requests", "Rung 3+ promotions require the C-suite gate per the accountability model.");
  const rqHost = el("div"); rqPanel.appendChild(rqHost); app.appendChild(rqPanel);

  const auPanel = section("Rung-tagged audit log", "Every entry records the exact rung the agent held at the moment of the action.");
  const auHost = el("div"); auPanel.appendChild(auHost); app.appendChild(auPanel);

  function audit(agent, rungAt, action, actor) {
    store.add("audit", { ts: now(), agent, rungAt, action, actor });
  }

  function promote(a) {
    if (a.rung >= 4) return alert(a.name + " is already at Rung 4.");
    const to = a.rung + 1;
    if (to >= 3) {
      store.add("requests", { agent: a.name, from: a.rung, to, requestedBy: a.owner, date: now().slice(0, 10), status: "pending", approver: "CFO (Rung 3+ gate)", evidence: "— attach ProofLedger evidence packet —" });
      audit(a.name, a.rung, "Promotion R" + a.rung + "→R" + to + " requested; routed to C-suite gate", a.owner);
      alert("Rung " + to + " requires the C-suite gate — request created and routed for approval.");
    } else {
      store.update("agents", a.id, { rung: to });
      audit(a.name, a.rung, "Promotion R" + a.rung + "→R" + to + " approved at domain gate", a.owner);
    }
    bar.refresh(); render();
  }

  function demote(a) {
    if (a.rung <= 0) return alert(a.name + " is already at Rung 0.");
    const to = a.rung - 1;
    store.update("agents", a.id, { rung: to, credStatus: "expired", credential: "EXPIRED (demoted " + now().slice(0, 10) + ")" });
    audit(a.name, a.rung, "DEMOTION R" + a.rung + "→R" + to + " executed; credential auto-expired", "RungGuard policy engine");
    bar.refresh(); render();
  }

  function decideRequest(rq, approve) {
    store.update("requests", rq.id, { status: approve ? "approved" : "rejected" });
    if (approve) {
      const ag = store.get("agents").find(x => x.name === rq.agent);
      if (ag) {
        store.update("agents", ag.id, { rung: rq.to, credStatus: "active", credential: "svc-" + ag.name.slice(0, 10) + "-" + Date.now().toString(36) });
        audit(rq.agent, rq.from, "Promotion R" + rq.from + "→R" + rq.to + " approved at gate; new credential issued", rq.approver);
      }
    } else {
      audit(rq.agent, rq.from, "Promotion R" + rq.from + "→R" + rq.to + " rejected at gate", rq.approver);
    }
    bar.refresh(); render();
  }

  function render() {
    const agents = store.get("agents"), requests = store.get("requests"), auditLog = store.get("audit");
    statsBox.innerHTML = "";
    statsBox.appendChild(stat("Agents governed", agents.length));
    statsBox.appendChild(stat("At Rung 3+", agents.filter(a => a.rung >= 3).length, "warn"));
    statsBox.appendChild(stat("Expired credentials", agents.filter(a => a.credStatus === "expired").length, "crit"));
    statsBox.appendChild(stat("Pending gate approvals", requests.filter(r => r.status === "pending").length));

    agHost.innerHTML = "";
    agHost.appendChild(table(agents, [
      { key: "name", label: "Agent" },
      { key: "domain", label: "Domain", render: r => badge(r.domain, "info") },
      { key: "rung", label: "Rung", render: r => rungBadge(r.rung) },
      { key: "blast", label: "Blast-radius policy" },
      { key: "credential", label: "Credential", render: r => el("span", {}, [r.credential + " ", badge(r.credStatus, r.credStatus === "active" ? "ok" : "crit")]) },
      { key: "owner", label: "Domain owner" },
      { key: "actions", label: "", render: r => {
          const d = el("div", { class: "row", style: "min-width:150px" });
          d.appendChild(el("button", { class: "btn small ghost", onclick: () => promote(r) }, ["Promote ▲"]));
          d.appendChild(el("button", { class: "btn small danger", onclick: () => demote(r) }, ["Demote ▼"]));
          return d;
        } }
    ], { onDelete: ids => { store.removeByIds("agents", ids); bar.refresh(); render(); } }));

    rqHost.innerHTML = "";
    rqHost.appendChild(table(requests, [
      { key: "agent", label: "Agent" },
      { key: "move", label: "Move", render: r => "R" + r.from + " → R" + r.to },
      { key: "requestedBy", label: "Requested by" },
      { key: "approver", label: "Gate" },
      { key: "evidence", label: "Evidence" },
      { key: "status", label: "Status", render: r => badge(r.status, r.status === "approved" ? "ok" : r.status === "rejected" ? "crit" : "warn") },
      { key: "decide", label: "", render: r => {
          if (r.status !== "pending") return el("span");
          const d = el("div", { class: "row", style: "min-width:150px" });
          d.appendChild(el("button", { class: "btn small", onclick: () => decideRequest(r, true) }, ["Approve"]));
          d.appendChild(el("button", { class: "btn small danger", onclick: () => decideRequest(r, false) }, ["Reject"]));
          return d;
        } }
    ], { onDelete: ids => { store.removeByIds("requests", ids); bar.refresh(); render(); } }));

    auHost.innerHTML = "";
    const sorted = auditLog.slice().sort((a, b) => b.ts.localeCompare(a.ts));
    auHost.appendChild(table(sorted, [
      { key: "ts", label: "Timestamp" },
      { key: "agent", label: "Agent" },
      { key: "rungAt", label: "Rung at action", render: r => rungBadge(r.rungAt) },
      { key: "action", label: "Action" },
      { key: "actor", label: "Actor" }
    ], { onDelete: ids => { store.removeByIds("audit", ids); bar.refresh(); render(); } }));
  }

  store.seed(SEED);
  render();
})();
