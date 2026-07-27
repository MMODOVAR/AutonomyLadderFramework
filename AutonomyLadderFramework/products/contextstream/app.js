/* ContextStream — agent-context event bus with narrative-consistency checks */
(function () {
  const { el, table, badge, sampleToolbar, stat, section } = ALF;
  const store = ALF.Store("contextstream");

  const SEED = {
    schemas: [
      { id: "s1", name: "claim.approved", version: "v2", fields: "claimId, policyId, amount, currency, approvedBy", owner: "Claims" },
      { id: "s2", name: "payout.initiated", version: "v3", fields: "claimId, iban_masked, amount, currency", owner: "Payments" },
      { id: "s3", name: "customer.address.updated", version: "v1", fields: "customerId, addressHash, effectiveDate", owner: "Customer Service" },
      { id: "s4", name: "fraud.signal.raised", version: "v1", fields: "entityId, signalType, score", owner: "Fraud" }
    ],
    events: [
      { id: "e1", ts: "2026-07-24 09:14:02", type: "claim.approved", version: "v2", entity: "CLM-88412 / CUST-2291", payload: "{amount: 940, currency: EUR, approvedBy: agent:claims-fastlane}", domain: "Claims", consistency: "ok" },
      { id: "e2", ts: "2026-07-24 09:14:05", type: "payout.initiated", version: "v3", entity: "CLM-88412 / CUST-2291", payload: "{amount: 940, currency: EUR, iban_masked: IT**4417}", domain: "Payments", consistency: "ok" },
      { id: "e3", ts: "2026-07-24 10:02:41", type: "customer.address.updated", version: "v1", entity: "CUST-5140", payload: "{addressHash: a91f…, effectiveDate: 2026-07-24}", domain: "Customer Service", consistency: "ok" },
      { id: "e4", ts: "2026-07-24 10:03:10", type: "claim.approved", version: "v2", entity: "CLM-90177 / CUST-5140", payload: "{amount: 12500, currency: EUR, approvedBy: agent:claims-fastlane}", domain: "Claims", consistency: "flag",
        flag: "Narrative contradiction: Claims record shows CUST-5140 at previous address (hash 77c2…) while Customer Service published a1 new address 29s earlier. Composite risk: payout letter may go to a stale address." },
      { id: "e5", ts: "2026-07-24 11:47:22", type: "fraud.signal.raised", version: "v1", entity: "CUST-2291", payload: "{signalType: velocity, score: 0.81}", domain: "Fraud", consistency: "flag",
        flag: "Narrative contradiction: fraud signal raised for CUST-2291 after payout e2 already executed. Replay recommended for audit; RungGuard notified for possible demotion review of agent:claims-fastlane." },
      { id: "e6", ts: "2026-07-25 08:20:00", type: "payout.initiated", version: "v2", entity: "CLM-90101 / CUST-0043", payload: "{amount: 300, currency: EUR}", domain: "Payments", consistency: "flag",
        flag: "Schema drift: producer emitted payout.initiated v2 but registry current is v3 (missing iban_masked). Consumer agents may act on incomplete context." }
    ]
  };

  const app = document.getElementById("app");
  app.appendChild(section("Scenario", "One day of Northwind Mutual's agent-context traffic. Six events crossed the bus; the narrative-consistency engine flagged three — a stale-address contradiction, a fraud signal that arrived after a payout, and a schema-drift producer. Replay any event to reconstruct exactly what consuming agents saw at the time."));
  const bar = sampleToolbar(store, SEED, render);
  app.appendChild(bar);

  const statsBox = el("div", { class: "stats" }); app.appendChild(statsBox);

  const evPanel = section("Event stream", "Select rows to delete. Flagged events carry the consistency engine's explanation.");
  const evHost = el("div"); evPanel.appendChild(evHost); app.appendChild(evPanel);

  const replayPanel = section("Replay console", "Audit-grade reconstruction of the context a consumer received.");
  const logBox = el("div", { class: "log" }, [el("span", { class: "t" }, ["— select an event and press Replay —"])]);
  replayPanel.appendChild(logBox); app.appendChild(replayPanel);

  const schemaPanel = section("Schema registry", "Versioned context payload schemas, one owner domain each.");
  const schemaHost = el("div"); schemaPanel.appendChild(schemaHost); app.appendChild(schemaPanel);

  const pubPanel = section("Publish a test event");
  const typeIn = el("input", { type: "text", placeholder: "event type, e.g. claim.approved" });
  const entIn = el("input", { type: "text", placeholder: "entity ref, e.g. CLM-1 / CUST-9" });
  const payIn = el("input", { type: "text", placeholder: "payload summary" });
  const prow = el("div", { class: "row" });
  [["Type", typeIn], ["Entity", entIn], ["Payload", payIn]].forEach(([lab, node]) => {
    const d = el("div"); d.appendChild(el("label", { class: "f" }, [lab])); d.appendChild(node); prow.appendChild(d);
  });
  pubPanel.appendChild(prow);
  pubPanel.appendChild(el("div", { style: "margin-top:12px" }, [
    el("button", { class: "btn", onclick: () => {
      if (!typeIn.value.trim()) return alert("Event type required.");
      const known = store.get("schemas").some(s => s.name === typeIn.value.trim());
      store.add("events", {
        ts: new Date().toISOString().slice(0, 19).replace("T", " "),
        type: typeIn.value.trim(), version: known ? "current" : "unregistered",
        entity: entIn.value || "—", payload: payIn.value || "{}", domain: "Manual",
        consistency: known ? "ok" : "flag",
        flag: known ? undefined : "Unregistered schema: no contract exists for this event type in the registry."
      });
      typeIn.value = entIn.value = payIn.value = ""; render();
    }}, ["Publish"])
  ]));
  app.appendChild(pubPanel);

  function replay(ev) {
    const lines = [
      "<span class='t'>[" + ev.ts + "]</span> REPLAY " + ev.id + " — " + ev.type + " " + ev.version,
      "  entity   : " + ev.entity,
      "  payload  : " + ev.payload,
      "  producer : " + ev.domain + " domain",
      ev.consistency === "ok"
        ? "  <span class='ok'>consistency: PASS — narrative coherent across domains at emit time</span>"
        : "  <span class='" + (ev.flag && ev.flag.startsWith("Schema") ? "warn" : "crit") + "'>consistency: FLAG — " + (ev.flag || "") + "</span>",
      "  lineage  : bus → " + (ev.type.split(".")[0]) + " consumers (2 agents subscribed at emit time)"
    ];
    logBox.innerHTML = lines.join("<br>");
  }

  function render() {
    const events = store.get("events"), schemas = store.get("schemas");
    statsBox.innerHTML = "";
    statsBox.appendChild(stat("Events (24h window)", events.length));
    statsBox.appendChild(stat("Registered schemas", schemas.length));
    const flags = events.filter(e => e.consistency !== "ok").length;
    statsBox.appendChild(stat("Consistency flags", flags, flags ? "crit" : "good"));
    statsBox.appendChild(stat("Replayable", events.length, "good"));

    evHost.innerHTML = "";
    evHost.appendChild(table(events, [
      { key: "ts", label: "Timestamp" },
      { key: "type", label: "Event", render: r => el("span", {}, [r.type + " ", badge(r.version, "neutral")]) },
      { key: "domain", label: "Producer", render: r => badge(r.domain, "info") },
      { key: "entity", label: "Entity" },
      { key: "payload", label: "Payload" },
      { key: "consistency", label: "Narrative check", render: r => r.consistency === "ok"
          ? badge("PASS", "ok")
          : el("span", { title: r.flag || "" }, [badge("FLAG", "crit"), el("div", { style: "font-size:11px;color:var(--accent);max-width:280px;margin-top:4px" }, [r.flag || ""])]) },
      { key: "replay", label: "", render: r => el("button", { class: "btn small ghost", onclick: () => replay(r) }, ["Replay"]) }
    ], { onDelete: ids => { store.removeByIds("events", ids); bar.refresh(); render(); } }));

    schemaHost.innerHTML = "";
    schemaHost.appendChild(table(schemas, [
      { key: "name", label: "Schema" },
      { key: "version", label: "Current version" },
      { key: "fields", label: "Fields" },
      { key: "owner", label: "Owner domain", render: r => badge(r.owner, "info") }
    ], { onDelete: ids => { store.removeByIds("schemas", ids); bar.refresh(); render(); } }));
  }

  store.seed(SEED);
  render();
})();
