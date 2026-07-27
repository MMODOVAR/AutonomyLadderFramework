/* Readiness Radar — current-state assessment */
(function () {
  const { el, table, badge, sampleToolbar, stat, section } = ALF;
  const store = ALF.Store("readiness-radar");

  const QUESTIONS = [
    { id: "q1", pillar: "Decision Clarity", text: "Significant decisions have named owners and written correctness criteria." },
    { id: "q2", pillar: "Decision Clarity", text: "We can list our top 20 operational decisions without a workshop." },
    { id: "q3", pillar: "Data Narrative", text: "A customer's record tells one coherent story across our systems." },
    { id: "q4", pillar: "Data Narrative", text: "Domain events are published on a shared bus with agreed schemas." },
    { id: "q5", pillar: "Error Tolerance", text: "We have automated stop conditions (circuit breakers) for automated processes." },
    { id: "q6", pillar: "Error Tolerance", text: "Rollback procedures exist, are written down, and have been rehearsed." },
    { id: "q7", pillar: "Domain Ownership", text: "Domain teams can change their services without a central-IT ticket." },
    { id: "q8", pillar: "Domain Ownership", text: "Incident accountability per domain is unambiguous today." }
  ];

  function segment(score) { // score 8..40
    if (score >= 30) return { seg: "~10% · Ladder-ready", cls: "ok",
      path: ["Implement the full Autonomy Ladder", "Identify 3 high-value Rung 1 candidates", "Define the accountability matrix", "Measure decisions-per-day automated"] };
    if (score >= 20) return { seg: "~30% · Services ready, no decision surface", cls: "warn",
      path: ["Run the Decision Inventory immediately", "Deploy Rung 1 wins now", "Build semantic observability in parallel", "Graduate to Rung 2–3 per domain"] };
    return { seg: "~60% · Substrate not ready", cls: "crit",
      path: ["Fix data fragmentation before agents", "Adopt event-driven architecture first", "Agents on a 12–18 month horizon", "Declining to deploy is the right call"] };
  }

  const SEED = { assessments: [
    { id: "a1", org: "Northwind Mutual — Claims", date: "2026-06-02", answers: { q1: 4, q2: 3, q3: 3, q4: 4, q5: 2, q6: 2, q7: 4, q8: 4 } },
    { id: "a2", org: "Northwind Mutual — Underwriting", date: "2026-06-04", answers: { q1: 3, q2: 3, q3: 2, q4: 2, q5: 2, q6: 1, q7: 3, q8: 3 } },
    { id: "a3", org: "Northwind Mutual — Payments", date: "2026-06-05", answers: { q1: 5, q2: 4, q3: 4, q4: 4, q5: 4, q6: 4, q7: 4, q8: 5 } },
    { id: "a4", org: "Acme Logistics (benchmark peer)", date: "2026-05-20", answers: { q1: 2, q2: 2, q3: 1, q4: 1, q5: 1, q6: 1, q7: 2, q8: 2 } }
  ]};

  function total(a) { return QUESTIONS.reduce((s, q) => s + (a.answers[q.id] || 0), 0); }

  const app = document.getElementById("app");
  app.appendChild(section("Scenario", "Three Northwind Mutual domains and one benchmark peer have completed the eight-question readiness assessment (1 = strongly disagree … 5 = strongly agree) across the readiness pillars. Each assessment is scored and placed into the 60/30/10 current-state segment with a prescribed path. Run a new assessment below to see your own placement alongside the samples."));
  const bar = sampleToolbar(store, SEED, render);
  app.appendChild(bar);

  const statsBox = el("div", { class: "stats" }); app.appendChild(statsBox);

  const listPanel = section("Completed assessments", "Select rows to delete. The prescribed path follows the framework's current-state reality check.");
  const listHost = el("div"); listPanel.appendChild(listHost); app.appendChild(listPanel);

  const runPanel = section("Run a new assessment", "Answer the eight statements for your organisation or domain.");
  const orgIn = el("input", { type: "text", placeholder: "Organisation / domain name" });
  runPanel.appendChild(el("label", { class: "f" }, ["Name"])); runPanel.appendChild(orgIn);
  const answerState = {};
  QUESTIONS.forEach(q => {
    answerState[q.id] = 3;
    runPanel.appendChild(el("label", { class: "f" }, [q.pillar + " — " + q.text]));
    const lik = el("div", { class: "likert" });
    for (let n = 1; n <= 5; n++) {
      const b = el("button", { type: "button" }, [String(n)]);
      if (n === 3) b.classList.add("sel");
      b.addEventListener("click", () => {
        answerState[q.id] = n;
        lik.querySelectorAll("button").forEach(x => x.classList.remove("sel"));
        b.classList.add("sel");
      });
      lik.appendChild(b);
    }
    runPanel.appendChild(lik);
  });
  runPanel.appendChild(el("div", { style: "margin-top:14px" }, [
    el("button", { class: "btn", onclick: () => {
      if (!orgIn.value.trim()) return alert("Name the organisation or domain first.");
      store.add("assessments", { org: orgIn.value.trim(), date: new Date().toISOString().slice(0, 10), answers: Object.assign({}, answerState) });
      orgIn.value = ""; render(); window.scrollTo({ top: 0, behavior: "smooth" });
    }}, ["Score assessment"])
  ]));
  app.appendChild(runPanel);

  function render() {
    const rows = store.get("assessments");
    statsBox.innerHTML = "";
    statsBox.appendChild(stat("Assessments", rows.length));
    const segs = rows.map(a => segment(total(a)).seg);
    statsBox.appendChild(stat("Ladder-ready", segs.filter(s => s.startsWith("~10")).length, "good"));
    statsBox.appendChild(stat("Deploy-now segment", segs.filter(s => s.startsWith("~30")).length, "warn"));
    statsBox.appendChild(stat("Substrate-first", segs.filter(s => s.startsWith("~60")).length, "crit"));

    listHost.innerHTML = "";
    listHost.appendChild(table(rows, [
      { key: "org", label: "Organisation / domain" },
      { key: "date", label: "Date" },
      { key: "score", label: "Score", render: r => {
          const s = total(r);
          const g = el("div", { style: "min-width:120px" });
          g.appendChild(el("div", {}, [s + " / 40"]));
          const gg = el("div", { class: "gauge" }); gg.appendChild(el("div", { style: "width:" + Math.round(s / 40 * 100) + "%" }));
          g.appendChild(gg); return g;
        } },
      { key: "seg", label: "Segment", render: r => { const s = segment(total(r)); return badge(s.seg, s.cls); } },
      { key: "path", label: "Prescribed path", render: r => {
          const s = segment(total(r));
          const ul = el("ul", { style: "margin:0;padding-left:16px" });
          s.path.forEach(p => ul.appendChild(el("li", {}, [p])));
          return ul;
        } }
    ], { onDelete: ids => { store.removeByIds("assessments", ids); bar.refresh(); render(); } }));
  }

  store.seed(SEED);
  render();
})();
