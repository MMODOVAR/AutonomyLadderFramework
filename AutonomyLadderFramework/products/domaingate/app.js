/* DomainGate — contract-to-MCP generation with domain isolation */
(function () {
  const { el, table, badge, sampleToolbar, stat, section } = ALF;
  const store = ALF.Store("domaingate");

  const SEED = {
    contexts: [
      { id: "c1", name: "Claims", contract: "claims-api v3.2 (OpenAPI)", mcp: "mcp-claims.northwind.internal", tools: "get_claim, list_claims, approve_claim, request_evidence", status: "Generated", version: "1.4.0" },
      { id: "c2", name: "Underwriting", contract: "uw-core v2.0 (OpenAPI)", mcp: "mcp-underwriting.northwind.internal", tools: "quote_risk, get_rate_plan, bind_policy", status: "Generated", version: "1.1.2" },
      { id: "c3", name: "Payments", contract: "payout-svc v5.1 (OpenAPI)", mcp: "mcp-payments.northwind.internal", tools: "initiate_payout, verify_iban, payout_status", status: "Generated", version: "2.0.0" },
      { id: "c4", name: "Customer Service", contract: "cs-desk v1.9 (OpenAPI)", mcp: "mcp-custserv.northwind.internal", tools: "get_case, draft_reply, close_case", status: "Generated", version: "1.0.3" },
      { id: "c5", name: "Fraud", contract: "siu-graph v0.9 (draft)", mcp: "— pending generation —", tools: "—", status: "Draft contract", version: "—" }
    ],
    grants: [
      { id: "g1", from: "Claims", to: "Payments", tool: "initiate_payout", condition: "claim.status == APPROVED", approvedBy: "M. Greco", expires: "2026-12-31" },
      { id: "g2", from: "Claims", to: "Fraud", tool: "risk_signal (read-only)", condition: "always", approvedBy: "P. Ricci", expires: "2026-12-31" },
      { id: "g3", from: "Customer Service", to: "Claims", tool: "get_claim (read-only)", condition: "case.claimRef != null", approvedBy: "L. Bianchi", expires: "2026-09-30" }
    ]
  };

  const app = document.getElementById("app");
  app.appendChild(section("Scenario", "Northwind Mutual's platform team has pointed DomainGate at four service contracts; four scoped MCP servers were generated, one per bounded context, each exposing only that domain's tools. Cross-domain access is denied by default: the three explicit grants below are the only paths through the anti-corruption layer. Use the simulator to see the policy engine decide."));
  const bar = sampleToolbar(store, SEED, render);
  app.appendChild(bar);

  const statsBox = el("div", { class: "stats" }); app.appendChild(statsBox);

  const ctxPanel = section("Bounded contexts & generated MCP servers");
  const ctxHost = el("div"); ctxPanel.appendChild(ctxHost); app.appendChild(ctxPanel);

  const grantPanel = section("Cross-domain grants (deny-by-default)", "Everything not listed here is denied by construction. Grants carry a condition, an approver from the target domain, and an expiry.");
  const grantHost = el("div"); grantPanel.appendChild(grantHost); app.appendChild(grantPanel);

  const simPanel = section("Access simulator", "Ask: can an agent in domain A call a tool in domain B? The policy engine answers exactly as the generated gateways would.");
  const fromSel = el("select"), toSel = el("select"), toolIn = el("input", { type: "text", placeholder: "tool name, e.g. initiate_payout" });
  const simRow = el("div", { class: "row" });
  [["Agent domain", fromSel], ["Target domain", toSel], ["Tool", toolIn]].forEach(([lab, node]) => {
    const d = el("div"); d.appendChild(el("label", { class: "f" }, [lab])); d.appendChild(node); simRow.appendChild(d);
  });
  simPanel.appendChild(simRow);
  const simOut = el("div", { class: "callout", style: "display:none" });
  simPanel.appendChild(el("div", { style: "margin-top:12px" }, [
    el("button", { class: "btn", onclick: simulate }, ["Evaluate access"])
  ]));
  simPanel.appendChild(simOut);
  app.appendChild(simPanel);

  function simulate() {
    const from = fromSel.value, to = toSel.value, tool = toolIn.value.trim();
    simOut.style.display = "block";
    if (from === to) {
      simOut.innerHTML = "<b style='color:var(--green)'>ALLOW</b> — same bounded context. Agents may use every tool their own domain's MCP server exposes.";
      return;
    }
    const grant = store.get("grants").find(g => g.from === from && g.to === to && (!tool || g.tool.split(" ")[0] === tool));
    if (grant) {
      simOut.innerHTML = "<b style='color:var(--green)'>ALLOW (conditional)</b> — explicit grant <b>" + grant.tool +
        "</b> from " + from + " → " + to + ", condition <code>" + grant.condition + "</code>, approved by " +
        grant.approvedBy + ", expires " + grant.expires + ". All other " + to + " tools remain invisible to " + from + " agents.";
    } else {
      simOut.innerHTML = "<b style='color:var(--accent)'>DENY</b> — no grant exists from <b>" + from + "</b> to <b>" + to +
        (tool ? "</b> for tool <b>" + tool + "</b>" : "</b>") +
        ". Cross-domain access is denied by default; to enable it, the " + to + " domain owner must approve an explicit, expiring grant.";
    }
  }

  function render() {
    const contexts = store.get("contexts"), grants = store.get("grants");
    statsBox.innerHTML = "";
    statsBox.appendChild(stat("Bounded contexts", contexts.length));
    statsBox.appendChild(stat("MCP servers generated", contexts.filter(c => c.status === "Generated").length, "good"));
    statsBox.appendChild(stat("Cross-domain grants", grants.length));
    statsBox.appendChild(stat("Default policy", "DENY", "crit"));

    ctxHost.innerHTML = "";
    ctxHost.appendChild(table(contexts, [
      { key: "name", label: "Domain", render: r => badge(r.name, "info") },
      { key: "contract", label: "Source contract" },
      { key: "mcp", label: "Generated MCP endpoint" },
      { key: "tools", label: "Exposed tools" },
      { key: "version", label: "Server version" },
      { key: "status", label: "Status", render: r => badge(r.status, r.status === "Generated" ? "ok" : "warn") }
    ], { onDelete: ids => { store.removeByIds("contexts", ids); bar.refresh(); render(); } }));

    grantHost.innerHTML = "";
    grantHost.appendChild(table(grants, [
      { key: "from", label: "From domain" },
      { key: "to", label: "To domain" },
      { key: "tool", label: "Granted tool" },
      { key: "condition", label: "Condition" },
      { key: "approvedBy", label: "Approved by (target owner)" },
      { key: "expires", label: "Expires" }
    ], { onDelete: ids => { store.removeByIds("grants", ids); bar.refresh(); render(); } }));

    const names = contexts.map(c => c.name);
    [fromSel, toSel].forEach(sel => {
      const cur = sel.value; sel.innerHTML = "";
      names.forEach(n => sel.appendChild(el("option", { value: n }, [n])));
      if (names.includes(cur)) sel.value = cur;
    });
    if (names.length > 1 && fromSel.value === toSel.value) toSel.selectedIndex = 1;
  }

  store.seed(SEED);
  render();
})();
