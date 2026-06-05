(function () {
  const LS_ENTRIES = "akuai_lai_checkin_entries_v1";
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
    const cleanCode = String(code || "").trim().toUpperCase();

    return loadEntries().some(e =>
      String(e.code || "").trim().toUpperCase() === cleanCode
    );
  }

  function addLocal(att) {
    const entries = loadEntries();

    entries.unshift({
      code: att.code || "",
      id_grupo: att.id_grupo || "",
      name: att.name || "",
      category: att.category || "Entrada",
      cedula: att.cedula || "",
      whatsapp: att.whatsapp || "",
      email: att.email || "",
      modalidad: att.modalidad || "",
      confirmacion_pago: att.confirmacion_pago || "",
      checked_at: att.checked_at || "",
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