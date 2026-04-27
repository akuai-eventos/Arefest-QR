(function () {
  const { apiUrl, useMock } = window.APP_CONFIG;

  function normalizeLookupResponse(data, fallbackCode) {
    if (!data) return { ok: false };

    // 🔥 CASO GOOGLE SHEETS (pedido real)
    if (data.order) {
      return {
        ok: !!data.ok,
        attendee: {
          code: data.order.code || fallbackCode,
          name: data.order.comprador || "",
          category: data.order.modalidad || "Pedido",
          photo: "",
          cedula: data.order.cedula || "",
          whatsapp: data.order.whatsapp || "",
          checked_in:
            String(data.order.retirado || "").toUpperCase() === "SI" ||
            String(data.order.retirado || "").toUpperCase() === "SÍ",

          checked_at: data.order.hora_retiro || "",

          // 👇 SOLO LO NECESARIO PARA EL LECTOR QR
          combos: data.order.combos || 0,

          sabores: [
            data.order.catira ? `Catira x${data.order.catira}` : null,
            data.order.pelua ? `Pelúa x${data.order.pelua}` : null,
            data.order.reina ? `Reina x${data.order.reina}` : null,
            data.order.rumbera ? `Rumbera x${data.order.rumbera}` : null,
            data.order.akuai ? `Akuai x${data.order.akuai}` : null
          ].filter(Boolean).join(", "),

          bebida: data.order.bebida || ""
        }
      };
    }

    // 🔹 fallback genérico
    return {
      ok: !!data.ok,
      attendee: {
        code: data.code || fallbackCode,
        name: data.name || data.comprador || "",
        category: data.category || data.modalidad || "Pedido",
        photo: data.photo ? String(data.photo).trim() : "",
        checked_in: !!data.checked_in,
        checked_at: data.checked_at || data.hora_retiro || ""
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
      status: "delivered",
      checked_at: attendee.checked_at,
      delivered_at: attendee.checked_at
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
      action: "deliver",
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

      return data;
    } catch {
      return { ok: false, error: "INVALID_RESPONSE", raw: text };
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