import { api, initTopbar, hasConsent } from "/common.js";

const makeQrBtn = document.getElementById("makeQrBtn");
const qrDiv = document.getElementById("qr");
const statusEl = document.getElementById("status");
const uploadLink = document.getElementById("uploadLink");
const resultImg = document.getElementById("resultImg");

let evtSource = null;
let currentSessionId = null;

function setStatus(t) { statusEl.textContent = t || ""; }

function clearQr() {
  qrDiv.innerHTML = "";
  uploadLink.textContent = "";
  uploadLink.href = "#";
}

function setImage(url) {
  if (!url) return;
  resultImg.src = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

(async function init() {
  await initTopbar({ requireAuth: true });

  if (!hasConsent()) {
    window.location.href = "/consent.html";
    return;
  }
})();

makeQrBtn.addEventListener("click", async () => {
  clearQr();
  resultImg.removeAttribute("src");
  setStatus("Creating session...");

  try {
    const data = await api("/api/session", "GET");
    currentSessionId = data.sessionId;

    new QRCode(qrDiv, { text: data.uploadUrl, width: 220, height: 220 });
    uploadLink.href = data.uploadUrl;
    uploadLink.textContent = data.uploadUrl;

    setStatus("Scan QR on phone and upload.");

    if (evtSource) evtSource.close();
    evtSource = new EventSource(`/api/stream/session/${encodeURIComponent(currentSessionId)}`);

    evtSource.addEventListener("image", (evt) => {
      const msg = JSON.parse(evt.data);
      setImage(msg.publicUrl);
      setStatus("Displayed.");
    });

    evtSource.addEventListener("error", () => {
      // happens if session expires or you get logged out
      setStatus("Live updates disconnected (reload page if needed).");
    });
  } catch (e) {
    setStatus(e.message);
  }
});