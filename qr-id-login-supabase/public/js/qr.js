import {
  api,
  initTopbar,
  hasConsent,
  hasTutorial,
  removeCurrentUrlSearchParam,
  setTutorial,
  withCacheBust
} from "/js/common.js";
import { initCountdownTimer } from "/js/timer.js";
import { initJoyrideTour } from "/js/joyrideTour.js";
import { initWorkspace, refreshWorkspaceCanvas } from "/js/workspace.js";
import { initChat } from "/js/chat.js";

const makeQrBtn = document.getElementById("makeQrBtn");
const qrDiv = document.getElementById("qr");
const statusEl = document.getElementById("status");
const uploadLink = document.getElementById("uploadLink");
const resultImg = document.getElementById("resultImg");

const qrView = document.getElementById("qrView");
const workspaceView = document.getElementById("workspaceView");
const showQrViewBtn = document.getElementById("showQrViewBtn");
const showWorkspaceViewBtn = document.getElementById("showWorkspaceViewBtn");

let evtSource = null;
let timerCtrl = null;
let workspaceReady = false;

function setStatus(t) { statusEl.textContent = t || ""; }

function clearQr() {
  qrDiv.innerHTML = "";
  uploadLink.textContent = "";
  uploadLink.href = "#";
}

function setImage(url) {
  if (!url) return;
  resultImg.src = withCacheBust(url);
}

function setActiveSwitch(active) {
  showQrViewBtn.classList.toggle("secondary", active !== "qr");
  showWorkspaceViewBtn.classList.toggle("secondary", active !== "workspace");
}

function showQr() {
  qrView.classList.remove("hidden");
  workspaceView.classList.add("hidden");
  setActiveSwitch("qr");
}

function showWorkspace() {
  qrView.classList.add("hidden");
  workspaceView.classList.remove("hidden");
  setActiveSwitch("workspace");

  if (!workspaceReady) {
    initWorkspace();
    workspaceReady = true;
  }
  refreshWorkspaceCanvas();
}

(async function init() {
  await initTopbar({ requireAuth: true });

  if (!hasConsent()) {
    window.location.href = "/html/consent.html";
    return;
  }

  timerCtrl = initCountdownTimer();

  const url = new URL(window.location.href);
  const forced = url.searchParams.get("tour") === "1";
  const autoStart = forced || !hasTutorial();

  initJoyrideTour({
    autoStart,
    getTimerCtrl: () => timerCtrl,
    onComplete: () => {
      setTutorial();
      removeCurrentUrlSearchParam("tour");
    }
  });

  showQrViewBtn.addEventListener("click", showQr);
  showWorkspaceViewBtn.addEventListener("click", showWorkspace);
  showQr();

  initChat();

  setTimeout(() => {
    document.getElementById("helpBtn")?.click();
  }, 0);
})();

makeQrBtn.addEventListener("click", async () => {
  clearQr();
  resultImg.removeAttribute("src");
  setStatus("Creating session...");

  try {
    const data = await api("/api/session", "GET");
    const sessionId = data.sessionId;

    new globalThis.QRCode(qrDiv, { text: data.uploadUrl, width: 220, height: 220 });
    uploadLink.href = data.uploadUrl;
    uploadLink.textContent = data.uploadUrl;

    setStatus("Scan QR on phone and upload.");

    if (evtSource) evtSource.close();
    evtSource = new EventSource(`/api/stream/session/${encodeURIComponent(sessionId)}`);

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
