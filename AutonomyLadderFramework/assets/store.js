/* Autonomy Ladder Framework — shared store
 * localStorage-backed store per product, with first-class sample-data lifecycle:
 *  - seed(): load the default demo scenario (records flagged _sample:true)
 *  - clearSamples(): remove every sample record, keep user-created ones
 *  - removeByIds(): remove selected records (sample or user)
 * Every product auto-seeds on first visit so it is demo-ready by default.
 */
(function (global) {
  function Store(productKey, collections) {
    const LS_KEY = "alf:" + productKey;
    const SEED_FLAG = LS_KEY + ":seeded";

    function readAll() {
      try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
      catch (e) { return {}; }
    }
    function writeAll(data) { localStorage.setItem(LS_KEY, JSON.stringify(data)); }

    const api = {
      key: productKey,
      get(collection) { return (readAll()[collection]) || []; },
      set(collection, records) {
        const all = readAll(); all[collection] = records; writeAll(all);
      },
      add(collection, record) {
        const recs = api.get(collection);
        record.id = record.id || (collection + "-" + Date.now().toString(36));
        recs.push(record); api.set(collection, recs); return record;
      },
      update(collection, id, patch) {
        api.set(collection, api.get(collection).map(r => r.id === id ? Object.assign({}, r, patch) : r));
      },
      removeByIds(collection, ids) {
        const idset = new Set(ids);
        api.set(collection, api.get(collection).filter(r => !idset.has(r.id)));
      },
      seed(seedData, force) {
        if (!force && localStorage.getItem(SEED_FLAG)) return false;
        const all = readAll();
        Object.keys(seedData).forEach(col => {
          const existing = (all[col] || []).filter(r => !r._sample);
          const samples = seedData[col].map(r => Object.assign({ _sample: true }, r));
          all[col] = samples.concat(existing);
        });
        writeAll(all);
        localStorage.setItem(SEED_FLAG, "1");
        return true;
      },
      reseed(seedData) { return api.seed(seedData, true); },
      clearSamples() {
        const all = readAll();
        Object.keys(all).forEach(col => { all[col] = all[col].filter(r => !r._sample); });
        writeAll(all);
        localStorage.setItem(SEED_FLAG, "1"); // stay cleared until explicit reload
      },
      sampleCount() {
        const all = readAll();
        return Object.values(all).reduce((n, col) => n + col.filter(r => r._sample).length, 0);
      },
      resetAll() { localStorage.removeItem(LS_KEY); localStorage.removeItem(SEED_FLAG); }
    };
    return api;
  }
  global.ALF = global.ALF || {};
  global.ALF.Store = Store;
})(window);
