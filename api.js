(function () {
  const { apiUrl, useMock } = window.APP_CONFIG;

  function normalizarSiNo(value) {
    const v = String(value || "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return v === "SI" || v === "TRUE" || v === "VERDADERO";
  }

  function normalizeLookupResponse(data, fallbackCode) {
    if (!data) return { ok: false };

    /*
      CASO ACTUAL: SISTEMA DE ENTRADAS
      El Code.gs devuelve:
      {
        ok: true,
        entrada: {
          code,
          id_grupo,
          nombre,
          cedula,
          whatsapp,
          email,
          categoria,
          modalidad,
          confirmacion_pago,
          checkin,
          hora_checkin,
          validacion
        }
      }
    */
    if (data.entrada) {
      return {
        ok: !!data.ok,
        attendee: {
          code: data.entrada.code || fallbackCode,
          id_grupo: data.entrada.id_grupo || "",
          name: data.entrada.nombre || "",
          cedula: data.entrada.cedula || "",
          whatsapp: data.entrada.whatsapp || "",
          email: data.entrada.email || "",
          category: data.entrada.categoria || "Entrada",
          modalidad: data.entrada.modalidad || "",
          confirmacion_pago: data.entrada.confirmacion_pago || "",
          validacion: data.entrada.validacion || "",
          photo: "",
          checked_in: normalizarSiNo(data.entrada.checkin),
          checked_at: data.entrada.hora_checkin || ""
        }
      };
    }

    /*
      FALLBACK VIEJO: por si algún endpoint todavía devuelve order.
      Lo dejo para que no se rompa si llega una respuesta antigua.
    */
    if (data.order) {
      return {
        ok: !!data.ok,
        attendee: {
          code: data.order.code || fallbackCode,
          id_grupo: data.order.id_grupo || "",
          name: data.order.comprador || data.order.nombre || "",
          cedula: data.order.cedula || "",
          whatsapp: data.order.whatsapp || "",
          email: data.order.email || "",
          category: data.order.categoria || data.order.modalidad || "Entrada",
          modalidad: data.order.modalidad || "",
          confirmacion_pago: data.order.confirmacion_pago || "",
          validacion: data.order.validacion || "",
          photo: "",
          checked_in:
            normalizarSiNo(data.order.checkin) ||
            normalizarSiNo(data.order.retirado),
          checked_at: data.order.hora_checkin || data.order.hora_retiro || ""
        }
      };
    }

    // Fallback genérico
    return {
      ok: !!data.ok,
      attendee: {
        code: data.code || fallbackCode,
        id_grupo: data.id_grupo || "",
        name: data.name || data.nombre || data.comprador || "",
        cedula: data.cedula || "",
        whatsapp: data.whatsapp || "",
        email: data.email || "",
        category: data.category || data.categoria || data.modalidad || "Entrada",
        modalidad: data.modalidad || "",
        confirmacion_pago: data.confirmacion_pago || "",
        validacion: data.validacion || "",
        photo: data.photo ? String(data.photo).trim() : "",
        checked_in: !!data.checked_in || normalizarSiNo(data.checkin),
        checked_at: data.checked_at || data.hora_checkin || ""
      }
    };
  }

  async function mockLookup(code) {
    const attendee = window.MOCK_ATTENDEES.find(
      item => item.code.toUpperCase() === String(code).trim().toUpperCase()
    );

    if (!attendee) {
      return { ok: false, error: "NOT_FOUND" };
    }

    return {
      ok: true,
      attendee: { ...attendee }
    };
  }

  async function mockCheckin(code) {
    const attendee = window.MOCK_ATTENDEES.find(
      item => item.code.toUpperCase() === String(code).trim().toUpperCase()
    );

    if (!attendee) {
      return { ok: false, error: "NOT_FOUND" };
    }

    if (attendee.checked_in) {
      return {
        ok: true,
        status: "duplicate",
        checked_at: attendee.checked_at
      };
    }

    attendee.checked_in = true;
    attendee.checked_at = new Date().toISOString();

    return {
      ok: true,
      status: "checked_in",
      checked_at: attendee.checked_at
    };
  }

  async function liveLookup(code) {
    const url = `${apiUrl}?action=lookup&code=${encodeURIComponent(code)}`;
    const res = await fetch(url);

    if (!res.ok) {
      return { ok: false, error: "NETWORK_ERROR" };
    }

    const data = await res.json();
    return normalizeLookupResponse(data, code);
  }

  async function liveCheckin(code) {
    const body = new URLSearchParams({
      action: "checkin",
      code
    });

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body
    });

    const text = await res.text();

    try {
      const data = JSON.parse(text);

      if (data.delivered_at && !data.checked_at) {
        data.checked_at = data.delivered_at;
      }

      if (data.hora_checkin && !data.checked_at) {
        data.checked_at = data.hora_checkin;
      }

      return data;
    } catch {
      return {
        ok: false,
        error: "INVALID_RESPONSE",
        raw: text
      };
    }
  }

  window.api = {
    lookup(code) {
      return useMock ? mockLookup(code) : liveLookup(code);
    },
    checkin(code) {
      return useMock ? mockCheckin(code) : liveCheckin(code);
    }
  };
})();