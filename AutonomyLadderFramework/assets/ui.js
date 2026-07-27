/* Autonomy Ladder Framework — shared UI helpers */
(function (global) {
  const RUNG_LABELS = ["R0 · Human-Led", "R1 · AI-Assisted", "R2 · Human-in-Loop", "R3 · Bounded Autonomy", "R4 · Fully Autonomous"];
  const RUNG_CLASSES = ["rung0", "rung1", "rung2", "rung3", "rung4"];

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    (children || []).forEach(c => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  function rungBadge(rung) {
    return el("span", { class: "badge " + RUNG_CLASSES[rung] }, [RUNG_LABELS[rung]]);
  }
  function badge(text, cls) { return el("span", { class: "badge " + (cls || "") }, [text]); }
  function sampleBadge() { return el("span", { class: "badge sample", title: "Part of the demo scenario — removable" }, ["SAMPLE"]); }

  /* Sample-data toolbar shown on every product page */
  function sampleToolbar(store, seedData, onChange) {
    const bar = el("div", { class: "sample-bar" });
    function render() {
      bar.innerHTML = "";
      const count = store.sampleCount();
      bar.appendChild(el("div", { class: "sample-info" }, [
        el("span", { class: "dot " + (count ? "on" : "off") }),
        count
          ? count + " sample records loaded — the full demo scenario is active"
          : "No sample data loaded — the product is empty or showing only your own records"
      ]));
      const actions = el("div", { class: "sample-actions" });
      actions.appendChild(el("button", {
        class: "btn ghost", onclick: () => { store.reseed(seedData); render(); onChange(); }
      }, [count ? "Reload sample scenario" : "Load sample scenario"]));
      if (count) actions.appendChild(el("button", {
        class: "btn danger", onclick: () => { store.clearSamples(); render(); onChange(); }
      }, ["Remove all sample data"]));
      bar.appendChild(actions);
    }
    render();
    bar.refresh = render;
    return bar;
  }

  /* Selectable table. columns: [{key,label,render?}] */
  function table(records, columns, opts) {
    opts = opts || {};
    const selected = new Set();
    const wrap = el("div", { class: "table-wrap" });
    const controls = el("div", { class: "table-controls" });
    const delBtn = el("button", { class: "btn danger", disabled: "disabled" }, ["Delete selected (0)"]);
    delBtn.addEventListener("click", () => {
      if (opts.onDelete && selected.size) opts.onDelete(Array.from(selected));
    });
    controls.appendChild(delBtn);
    if (opts.controlsExtra) controls.appendChild(opts.controlsExtra);
    wrap.appendChild(controls);

    const t = el("table", { class: "data" });
    const thead = el("thead"); const hr = el("tr");
    const allCb = el("input", { type: "checkbox" });
    allCb.addEventListener("change", () => {
      selected.clear();
      if (allCb.checked) records.forEach(r => selected.add(r.id));
      t.querySelectorAll("tbody input[type=checkbox]").forEach(cb => cb.checked = allCb.checked);
      sync();
    });
    hr.appendChild(el("th", { class: "cb" }, [allCb]));
    columns.forEach(c => hr.appendChild(el("th", {}, [c.label])));
    thead.appendChild(hr); t.appendChild(thead);

    const tbody = el("tbody");
    if (!records.length) {
      tbody.appendChild(el("tr", {}, [el("td", { colspan: String(columns.length + 1), class: "empty" },
        ["Nothing here yet. Load the sample scenario above, or add your own records."])]));
    }
    records.forEach(r => {
      const tr = el("tr", { class: r._sample ? "is-sample" : "" });
      const cb = el("input", { type: "checkbox" });
      cb.addEventListener("change", () => { cb.checked ? selected.add(r.id) : selected.delete(r.id); sync(); });
      tr.appendChild(el("td", { class: "cb" }, [cb]));
      columns.forEach(c => {
        const td = el("td");
        const v = c.render ? c.render(r) : (r[c.key] == null ? "" : String(r[c.key]));
        if (v instanceof Node) td.appendChild(v);
        else td.textContent = v;
        if (c.key === columns[0].key && r._sample) td.appendChild(sampleBadge());
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    wrap.appendChild(t);

    function sync() {
      delBtn.textContent = "Delete selected (" + selected.size + ")";
      selected.size ? delBtn.removeAttribute("disabled") : delBtn.setAttribute("disabled", "disabled");
    }
    return wrap;
  }

  function stat(label, value, cls) {
    return el("div", { class: "stat " + (cls || "") }, [
      el("div", { class: "stat-value" }, [String(value)]),
      el("div", { class: "stat-label" }, [label])
    ]);
  }

  function section(title, desc) {
    const s = el("section", { class: "panel" });
    s.appendChild(el("h2", {}, [title]));
    if (desc) s.appendChild(el("p", { class: "muted" }, [desc]));
    return s;
  }

  global.ALF = global.ALF || {};
  Object.assign(global.ALF, { el, table, badge, rungBadge, sampleBadge, sampleToolbar, stat, section, RUNG_LABELS });
})(window);
