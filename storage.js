(function () {
  const LS_ENTRIES = "akuai_entries_v5";
  const LS_THEME = "akuai_theme_v1";

  function loadEntries() {
    try {
      return JSON.parse(localStorage.getItem(LS_ENTRIES) || "[]");
    } catch {
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(LS_ENTRIES, JSON.stringify(entries));
  }

  function alreadyLocal(code) {
    return loadEntries().some(e => e.code === code);
  }

  function addLocal(att) {
    const entries = loadEntries();
    entries.unshift({
      code: att.code,
      name: att.name,
      category: att.category,
      ts: new Date().toISOString()
    });
    saveEntries(entries);
  }

  function clearEntries() {
    localStorage.removeItem(LS_ENTRIES);
  }

  function getTheme() {
    return localStorage.getItem(LS_THEME) || "light";
  }

  function setTheme(theme) {
    localStorage.setItem(LS_THEME, theme);
  }

  window.storage = {
    loadEntries,
    saveEntries,
    alreadyLocal,
    addLocal,
    clearEntries,
    getTheme,
    setTheme
  };
})();