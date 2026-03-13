import { api, initTopbar, hasConsent, hasTutorial, setTutorial } from "/common.js";
import { initCountdownTimer } from "/timer.js";
import { startTour } from "/tour.js";

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

function runTour(timerCtrl) {
  const steps = [
    {
      selector: ".timerBig",
      title: "Session timer",
      body: "This counts down from 30 minutes. Pause/Resume stops the countdown. End ends the session immediately."
    },
    {
      selector: "#makeQrBtn",
      title: "Generate QR",
      body: "Click this to create a new upload session and generate a QR code."
    },
    {
      selector: "#qr",
      title: "QR code",
      body: "Scan this on your phone to open the upload page."
    },
    {
      selector: "#uploadLink",
      title: "Upload link",
      body: "This is the same link as the QR code (useful for testing)."
    },
    {
      selector: "#resultImg",
      title: "Preview area",
      body: "After you upload on your phone, the latest image for this session appears here automatically."
    },
    {
      selector: ".topbarRight",
      title: "Navigation + account",
      body: "Use My uploads to see your full gallery. Use Log out to end your login session."
    }
  ];

  timerCtrl?.pause?.();

  startTour({
    steps,
    onFinish: () => {
      setTutorial();
      timerCtrl?.resume?.();
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      history.replaceState({}, "", url.pathname);
    },
    onSkip: () => {
      setTutorial();
      timerCtrl?.resume?.();
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      history.replaceState({}, "", url.pathname);
    }
  });
}

(async function init() {
  await initTopbar({ requireAuth: true });

  if (!hasConsent()) {
    window.location.href = "/consent.html";
    return;
  }

  const timerCtrl = initCountdownTimer();

  const url = new URL(window.location.href);
  const forced = url.searchParams.get("tour") === "1";

  if (forced || !hasTutorial()) {
    runTour(timerCtrl);
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
      setStatus("Live updates disconnected (reload page if needed).");
    });
  } catch (e) {
    setStatus(e.message);
  }
});