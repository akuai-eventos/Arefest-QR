(function () {

  const PLACEHOLDER_AVATAR =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
        <rect width="120" height="120" fill="#f2f2f2"/>
        <circle cx="60" cy="46" r="22" fill="#d7d7d7"/>
        <rect x="26" y="74" width="68" height="34" rx="17" fill="#d7d7d7"/>
      </svg>
    `);

  function extractDriveId(value) {
    if (!value) return "";

    const raw = String(value).trim();
    const first = raw.split(",")[0].trim();

    const match =
      first.match(/id=([a-zA-Z0-9_-]+)/) ||
      first.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      first.match(/[-\w]{25,}/);

    if (!match) return "";
    return match[1] || match[0] || "";
  }

  function toDriveDirectUrl(value) {
    const id = extractDriveId(value);
    if (!id) return "";

    // thumbnail suele funcionar mejor en <img> que uc?export=view
    return `https://drive.google.com/thumbnail?id=${id}&sz=w600`;
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));
  }

  function fmt(ts) {
    if (!ts) return "";

    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");

    return `${hh}:${mi} · ${dd}/${mm}/${yy}`;
  }

  window.ui = {
    PLACEHOLDER_AVATAR,
    extractDriveId,
    toDriveDirectUrl,
    escapeHtml,
    fmt
  };

})();