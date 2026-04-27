(function () {
  let html5Qr = null;
  let scanning = false;
  let scanLock = false;
  let lastScan = "";
  let lastScanAt = 0;

  async function probeCameraAccess(onStatus) {
    if (!window.isSecureContext) {
      throw new Error("SECURE_CONTEXT_REQUIRED");
    }

    if (!navigator.mediaDevices) {
      throw new Error("MEDIA_DEVICES_UNAVAILABLE");
    }

    if (!navigator.mediaDevices.getUserMedia) {
      throw new Error("GET_USER_MEDIA_UNAVAILABLE");
    }

    onStatus("Solicitando permiso de cámara...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" }
      },
      audio: false
    });

    stream.getTracks().forEach(track => track.stop());

    onStatus("Permiso concedido. Buscando cámara...");
  }

  async function getBestCameraId() {
    const devices = await Html5Qrcode.getCameras();

    if (!devices || !devices.length) {
      throw new Error("NO_CAMERAS_FOUND");
    }

    const preferred =
      devices.find(d => /back|rear|environment|trasera|traseira/i.test(d.label)) ||
      devices[devices.length - 1];

    return preferred.id;
  }

  function getQrBoxSize(viewfinderWidth, viewfinderHeight) {
    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);

    const edge = Math.floor(minEdge * 0.65);

    return {
      width: edge,
      height: edge
    };
  }

  async function start(onDetected, onStatus) {
    if (scanning) return;
    scanning = true;
    scanLock = false;

    try {
      await probeCameraAccess(onStatus);

      if (html5Qr) {
        try {
          await html5Qr.stop();
          await html5Qr.clear();
        } catch {}
        html5Qr = null;
      }

      try {
        html5Qr = new Html5Qrcode("reader", {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false
        });
      } catch {
        html5Qr = new Html5Qrcode("reader");
      }

      const cameraId = await getBestCameraId();

      onStatus("Cámara lista ✔ Escaneando...");

      await html5Qr.start(
        cameraId,
        {
          fps: 30,
          qrbox: (viewfinderWidth, viewfinderHeight) =>
            getQrBoxSize(viewfinderWidth, viewfinderHeight),
          disableFlip: true,
          aspectRatio: 1
        },
        async (decodedText) => {
          const now = Date.now();
          const code = String(decodedText || "").trim();

          if (!scanning) return;
          if (!code) return;
          if (scanLock) return;
          if (code === lastScan && (now - lastScanAt) < 2200) return;

          lastScan = code;
          lastScanAt = now;
          scanLock = true;

          try {
            await onDetected(code);
          } finally {
            setTimeout(() => {
              scanLock = false;
            }, 1200);
          }
        },
        () => {}
      );

      setTimeout(forceReaderLayout, 80);
      setTimeout(forceReaderLayout, 260);
      setTimeout(forceReaderLayout, 700);

    } catch (err) {
      scanning = false;
      throw err;
    }
  }

  async function stop() {
    scanning = false;
    scanLock = false;

    try {
      if (html5Qr) {
        const state = typeof html5Qr.getState === "function" ? html5Qr.getState() : null;

        if (state === 2 || state === 3 || state === "SCANNING" || state === "PAUSED") {
          await html5Qr.stop();
        }

        await html5Qr.clear();
      }
    } catch {}

    html5Qr = null;
  }

  function forceReaderLayout() {
    const reader = document.getElementById("reader");
    if (!reader) return;

    const video = reader.querySelector("video");
    const canvas = reader.querySelector("canvas");

    if (video) {
      video.style.width = "100%";
      video.style.height = "260px";
      video.style.objectFit = "cover";
      video.style.display = "block";
      video.style.borderRadius = "18px";
    }

    if (canvas) {
      canvas.style.width = "100%";
      canvas.style.height = "260px";
      canvas.style.objectFit = "cover";
      canvas.style.display = "block";
      canvas.style.borderRadius = "18px";
    }

    const innerDivs = reader.querySelectorAll("div");
    innerDivs.forEach(div => {
      div.style.padding = "0";
      div.style.border = "none";
    });
  }

  window.qrScanner = { start, stop };
})();