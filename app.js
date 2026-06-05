(function () {
  const config = window.APP_CONFIG;

  const screens = {
    scan: document.getElementById("screen-scan"),
    history: document.getElementById("screen-history"),
    settings: document.getElementById("screen-settings"),
  };

  const tabs = {
    scan: document.getElementById("tabScan"),
    history: document.getElementById("tabHistory"),
    settings: document.getElementById("tabSettings"),
  };

  const historyList = document.getElementById("historyList");
  const count = document.getElementById("count");
  const darkLabel = document.getElementById("darkLabel");

  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalClose = document.getElementById("modalClose");
  const mAvatar = document.getElementById("mAvatar");
  const mName = document.getElementById("mName");
  const mCat = document.getElementById("mCat");
  const mCode = document.getElementById("mCode");
  const mMsg = document.getElementById("mMsg");
  const mStatusOk = document.getElementById("mStatusOk");
  const mStatusBad = document.getElementById("mStatusBad");
  const btnRegister = document.getElementById("btnRegister");
  const btnAlready = document.getElementById("btnAlready");

  const dangerBackdrop = document.getElementById("dangerBackdrop");
  const dangerClose = document.getElementById("dangerClose");
  const dangerText = document.getElementById("dangerText");
  const dangerInput = document.getElementById("dangerInput");
  const dangerConfirm = document.getElementById("dangerConfirm");
  const dangerCancel = document.getElementById("dangerCancel");

  const btnStart = document.getElementById("btnStart");
  const btnStop = document.getElementById("btnStop");
  const scanIdle = document.getElementById("scanIdle");
  const scanLive = document.getElementById("scanLive");
  const camStatus = document.getElementById("camStatus");
  const toggleTheme = document.getElementById("toggleTheme");
  const btnClear = document.getElementById("btnClear");
  const manualCode = document.getElementById("manualCode");
  const btnManualSearch = document.getElementById("btnManualSearch");

  const brandTitle = document.getElementById("brandTitle");
  const brandSubtitle = document.getElementById("brandSubtitle");
  const aboutVersion = document.getElementById("aboutVersion");
  const scanFlash = document.getElementById("scanFlash");

  let currentAttendee = null;
  let scannerActive = false;
  let beepAudioCtx = null;
  let handlingScan = false;

  brandTitle.textContent = config.appName;
  brandSubtitle.textContent = config.subtitle;
  aboutVersion.textContent = `${config.appName} · Versión ${config.version}`;

  function limpiarCodigo(raw) {
    const text = String(raw || "").trim().toUpperCase();

    const match = text.match(/(?:LAI|AREFEST|AKUAI)-\d+/i);

    return match ? match[0].toUpperCase() : text;
  }

  function normalizarTexto(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function esPagoConfirmado(value) {
    const v = normalizarTexto(value);

    return (
      v === "VALIDADO" ||
      v === "PAGO VALIDADO" ||
      v === "SI CONFIRMADO" ||
      v === "SÍ CONFIRMADO" ||
      v === "CONFIRMADO" ||
      v === "APROBADO" ||
      v === "CORTESIA" ||
      v === "CORTESÍA"
    );
  }

  function setActiveTab(key) {
    Object.values(screens).forEach(s => s.classList.add("hidden"));
    Object.values(tabs).forEach(t => t.classList.remove("active"));
    screens[key].classList.remove("hidden");
    tabs[key].classList.add("active");

    if (key === "history") renderHistory();
    if (key !== "scan") stopScannerUI();
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      darkLabel.textContent = "Activado";
    } else {
      document.documentElement.removeAttribute("data-theme");
      darkLabel.textContent = "Desactivado";
    }

    storage.setTheme(theme);
  }

  function renderHistory() {
    const entries = storage.loadEntries();
    count.textContent = entries.length;
    historyList.innerHTML = "";

    if (entries.length === 0) {
      historyList.innerHTML = `<p class="tiny">Aún no hay ingresos registrados en este teléfono.</p>`;
      return;
    }

    for (const e of entries) {
      const row = document.createElement("div");
      row.className = "row";

      row.innerHTML = `
        <div class="left">
          <div class="title">${ui.escapeHtml(e.name || "Sin nombre")}</div>
          <div class="meta">🕒 ${ui.fmt(e.ts)}</div>
          <div class="meta">${ui.escapeHtml(e.code || "")}</div>

          <div class="history-details hidden">
            <div><strong>Cédula:</strong> ${ui.escapeHtml(e.cedula || "-")}</div>
            <div><strong>WhatsApp:</strong> ${ui.escapeHtml(e.whatsapp || "-")}</div>
            <div><strong>Email:</strong> ${ui.escapeHtml(e.email || "-")}</div>
            <div><strong>Grupo:</strong> ${ui.escapeHtml(e.id_grupo || "-")}</div>
            <div><strong>Modalidad:</strong> ${ui.escapeHtml(e.modalidad || "-")}</div>
            <div><strong>Categoría:</strong> ${ui.escapeHtml(e.category || "-")}</div>
          </div>
        </div>
        <div class="badge" style="white-space:nowrap;">${ui.escapeHtml(e.category || "Entrada")}</div>
      `;

      row.addEventListener("click", () => {
        const details = row.querySelector(".history-details");
        if (details) details.classList.toggle("hidden");
      });

      historyList.appendChild(row);
    }
  }

  function resetModalStates() {
    mStatusOk.classList.add("hidden");
    mStatusBad.classList.add("hidden");
    btnRegister.classList.add("hidden");
    btnAlready.classList.add("hidden");
    mMsg.textContent = "";
  }

  function flashScreen(type) {
    if (!scanFlash) return;

    scanFlash.className = "scan-flash";
    scanFlash.classList.add(type === "ok" ? "ok" : "bad");
    scanFlash.classList.add("show");

    setTimeout(() => scanFlash.classList.remove("show"), 220);
  }

  function vibratePattern(type) {
    if (!("vibrate" in navigator)) return;

    if (type === "ok") {
      navigator.vibrate([80]);
    } else {
      navigator.vibrate([80, 60, 80]);
    }
  }

  function beep(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!beepAudioCtx) beepAudioCtx = new AudioCtx();

      const ctx = beepAudioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = type === "ok" ? 880 : 280;

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (type === "ok" ? 0.12 : 0.2));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (type === "ok" ? 0.13 : 0.21));
    } catch {}
  }

  function proFeedback(type) {
    flashScreen(type);
    vibratePattern(type);
    beep(type);
  }

  function setAvatar(src) {
    const finalSrc = src ? String(src).trim() : "";

    mAvatar.onerror = function () {
      this.onerror = null;
      this.src = ui.PLACEHOLDER_AVATAR;
    };

    mAvatar.removeAttribute("src");

    setTimeout(() => {
      mAvatar.src = finalSrc || ui.PLACEHOLDER_AVATAR;
    }, 30);
  }

  function renderEntrada(att) {
    const safeName = ui.escapeHtml(att.name || "—");
    const safeCedula = ui.escapeHtml(att.cedula || "-");
    const safeWhatsapp = ui.escapeHtml(att.whatsapp || "-");
    const safeEmail = ui.escapeHtml(att.email || "-");
    const safeCategory = ui.escapeHtml(att.category || "Entrada");
    const safeCode = ui.escapeHtml(att.code || "—");
    const safeGrupo = ui.escapeHtml(att.id_grupo || "-");
    const safeModalidad = ui.escapeHtml(att.modalidad || "-");
    const safePago = ui.escapeHtml(att.confirmacion_pago || "-");

    mName.innerHTML = `
      ${safeName}
      <div class="tiny">CI: ${safeCedula}</div>
      <div class="tiny">📱 ${safeWhatsapp}</div>
    `;

    mCat.innerHTML = safeCategory;

    mCode.innerHTML = `
      <div class="tiny"><strong>Código:</strong> ${safeCode}</div>
      <div class="tiny"><strong>Grupo:</strong> ${safeGrupo}</div>
      <div class="tiny"><strong>Modalidad:</strong> ${safeModalidad}</div>
      <div class="tiny"><strong>Email:</strong> ${safeEmail}</div>
      <div class="tiny"><strong>Pago:</strong> ${safePago}</div>
    `;
  }

  function openModal(att, state) {
    currentAttendee = att || null;
    resetModalStates();

    if (state === "notfound") {
      setAvatar(ui.PLACEHOLDER_AVATAR);
      mName.textContent = "No se encontró";
      mCat.textContent = "—";
      mCode.textContent = "Código no válido";
      mStatusBad.textContent = "❌ No se encontró";
      mStatusBad.classList.remove("hidden");
      mMsg.textContent = "Ese código no existe en el registro.";
      proFeedback("bad");
      modalBackdrop.style.display = "flex";
      return;
    }

    const photoUrl = ui.toDriveDirectUrl(att.photo);
    setAvatar(photoUrl);
    renderEntrada(att);

    const dupGlobal = !!att.checked_in;
    const dupLocal = storage.alreadyLocal(att.code);

    if (!esPagoConfirmado(att.confirmacion_pago)) {
      mStatusBad.textContent = "❌ Pago no validado";
      mStatusBad.classList.remove("hidden");
      mMsg.textContent = "Esta entrada existe, pero Finanzas aún no ha validado el pago. No se puede registrar el ingreso.";
      proFeedback("bad");
      modalBackdrop.style.display = "flex";
      return;
    }

    if (dupGlobal) {
      mStatusOk.textContent = "✅ Ya ingresó";
      mStatusOk.classList.remove("hidden");
      btnAlready.classList.remove("hidden");
      mMsg.textContent = `Ingreso registrado · ${ui.fmt(att.checked_at) || att.checked_at || ""}`;
      proFeedback("ok");
      modalBackdrop.style.display = "flex";
      return;
    }

    if (dupLocal) {
      mStatusOk.textContent = "✅ Ya registrado en este teléfono";
      mStatusOk.classList.remove("hidden");
      btnAlready.classList.remove("hidden");
      mMsg.textContent = "Esta entrada ya fue marcada como ingresada desde este dispositivo.";
      proFeedback("ok");
      modalBackdrop.style.display = "flex";
      return;
    }

    btnRegister.disabled = false;
    btnRegister.textContent = "Registrar ingreso";
    btnRegister.classList.remove("hidden");
    mMsg.textContent = "Entrada validada. Lista para registrar ingreso.";
    proFeedback("ok");
    modalBackdrop.style.display = "flex";
  }

  function closeModal() {
    modalBackdrop.style.display = "none";
    currentAttendee = null;
  }

  function openDangerModal() {
    const entries = storage.loadEntries();
    const total = entries.length;

    dangerText.textContent =
      total > 0
        ? `Se eliminarán ${total} registro(s) guardados en este teléfono.`
        : "No hay registros guardados en este teléfono.";

    dangerInput.value = "";
    dangerConfirm.disabled = true;
    dangerBackdrop.style.display = "flex";

    setTimeout(() => {
      dangerInput.focus();
    }, 50);
  }

  function closeDangerModal() {
    dangerBackdrop.style.display = "none";
    dangerInput.value = "";
    dangerConfirm.disabled = true;
  }

  function validateDangerInput() {
    dangerConfirm.disabled = dangerInput.value.trim() !== "BORRAR";
  }

  function confirmClearHistory() {
    const entries = storage.loadEntries();

    if (!entries.length) {
      closeDangerModal();
      return;
    }

    storage.clearEntries();
    renderHistory();
    closeDangerModal();
    camStatus.textContent = "Historial local borrado correctamente.";
  }

  function explainCameraError(err) {
    const msg = String(err?.message || err || "");

    if (msg.includes("SECURE_CONTEXT_REQUIRED")) return "❌ La cámara requiere HTTPS o localhost.";
    if (msg.includes("MEDIA_DEVICES_UNAVAILABLE")) return "❌ Este navegador no expone mediaDevices.";
    if (msg.includes("GET_USER_MEDIA_UNAVAILABLE")) return "❌ Este navegador no soporta getUserMedia.";
    if (msg.includes("NO_CAMERAS_FOUND")) return "❌ No se encontró ninguna cámara disponible.";
    if (msg.toLowerCase().includes("notallowed")) return "❌ Permiso de cámara denegado.";
    if (msg.toLowerCase().includes("permission")) return "❌ Permiso de cámara bloqueado.";
    if (msg.toLowerCase().includes("notreadable")) return "❌ La cámara está en uso por otra app.";
    if (msg.toLowerCase().includes("overconstrained")) return "❌ No se pudo usar esa cámara del dispositivo.";

    return `❌ Error de cámara: ${msg || "desconocido"}`;
  }

  async function startScannerUI() {
    if (scannerActive) return;

    scannerActive = true;
    handlingScan = false;

    scanIdle.classList.add("hidden");
    scanLive.classList.remove("hidden");
    btnStart.classList.add("hidden");
    btnStop.classList.remove("hidden");
    camStatus.textContent = "Preparando cámara...";

    try {
      await qrScanner.start(handleScan, (msg) => {
        camStatus.textContent = msg;
      });
    } catch (err) {
      camStatus.textContent = explainCameraError(err);
      await stopScannerUI(false);
    }
  }

  async function stopScannerUI(clearMessage = true) {
    scannerActive = false;

    if (clearMessage) {
      camStatus.textContent = "";
    }

    await qrScanner.stop();

    btnStart.classList.remove("hidden");
    btnStop.classList.add("hidden");
    scanLive.classList.add("hidden");
    scanIdle.classList.remove("hidden");
  }

  async function handleScan(code) {
    if (handlingScan) return;

    code = limpiarCodigo(code);

    if (!code) {
      camStatus.textContent = "Código vacío.";
      return;
    }

    handlingScan = true;

    try {
      camStatus.textContent = "QR detectado ✔ Procesando...";
      await stopScannerUI(false);

      const data = await api.lookup(code);

      if (!data || !data.ok || !data.attendee) {
        openModal(null, "notfound");
        return;
      }

      openModal(data.attendee);
    } catch (error) {
      console.warn("Error procesando código:", error);
      openModal(null, "notfound");
    } finally {
      handlingScan = false;
    }
  }

  async function registerCurrent() {
    if (!currentAttendee) return;

    btnRegister.disabled = true;
    mMsg.textContent = "Registrando ingreso...";

    try {
      const res = await api.checkin(currentAttendee.code);

      if (res?.ok && res?.status === "duplicate") {
        resetModalStates();
        mStatusOk.textContent = "✅ Ya ingresó";
        mStatusOk.classList.remove("hidden");
        btnAlready.classList.remove("hidden");
        mMsg.textContent = `Ingreso registrado · ${ui.fmt(res.checked_at) || res.checked_at || ""}`;
        proFeedback("ok");
        return;
      }

      if (!res?.ok && res?.status === "pago_no_validado") {
        resetModalStates();
        mStatusBad.textContent = "❌ Pago no validado";
        mStatusBad.classList.remove("hidden");
        mMsg.textContent = "Finanzas aún no ha validado el pago de esta entrada.";
        proFeedback("bad");
        return;
      }

      if (res?.ok) {
        currentAttendee.checked_in = true;
        currentAttendee.checked_at = res.checked_at || res.delivered_at || new Date().toISOString();

        storage.addLocal(currentAttendee);

        resetModalStates();
        mStatusOk.textContent = "✅ Ingreso registrado";
        mStatusOk.classList.remove("hidden");
        btnAlready.classList.remove("hidden");
        mMsg.textContent = `Ingreso · ${ui.fmt(currentAttendee.checked_at) || currentAttendee.checked_at || ""}`;
        proFeedback("ok");

        setTimeout(closeModal, 900);
        return;
      }

      mMsg.textContent = "❌ No se pudo registrar el ingreso.";
      proFeedback("bad");
    } catch (error) {
      console.warn("Error registrando ingreso:", error);
      mMsg.textContent = "❌ Error registrando el ingreso.";
      proFeedback("bad");
    } finally {
      btnRegister.disabled = false;
    }
  }

  async function handleManualSearch() {
    const code = limpiarCodigo(manualCode.value);

    if (!code) {
      camStatus.textContent = "Escribe un código válido.";
      return;
    }

    camStatus.textContent = "Buscando código manual...";
    await handleScan(code);
  }

  tabs.scan.onclick = () => setActiveTab("scan");
  tabs.history.onclick = () => setActiveTab("history");
  tabs.settings.onclick = () => setActiveTab("settings");

  modalClose.onclick = closeModal;

  modalBackdrop.onclick = (e) => {
    if (e.target === modalBackdrop) closeModal();
  };

  btnAlready.onclick = () => {
    closeModal();
    setActiveTab("history");
  };

  dangerClose.onclick = closeDangerModal;
  dangerCancel.onclick = closeDangerModal;

  dangerBackdrop.onclick = (e) => {
    if (e.target === dangerBackdrop) closeDangerModal();
  };

  dangerInput.addEventListener("input", validateDangerInput);

  dangerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && dangerInput.value.trim() === "BORRAR") {
      e.preventDefault();
      confirmClearHistory();
    }
  });

  dangerConfirm.onclick = confirmClearHistory;

  btnStart.onclick = startScannerUI;
  btnStop.onclick = () => stopScannerUI(true);
  btnRegister.onclick = registerCurrent;
  btnManualSearch.onclick = handleManualSearch;

  manualCode.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleManualSearch();
    }
  });

  btnClear.onclick = () => {
    if (scannerActive) {
      camStatus.textContent = "Detén el escáner antes de borrar el historial.";
      return;
    }

    openDangerModal();
  };

  toggleTheme.onclick = () => {
    const next = storage.getTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
  };

  applyTheme(storage.getTheme());
  setActiveTab("scan");
})();