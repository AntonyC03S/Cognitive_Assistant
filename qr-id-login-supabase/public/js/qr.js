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

function setStatus(message) {
  statusEl.textContent = message || "";
}

function clearQrDisplay() {
  qrDiv.innerHTML = "";
  uploadLink.textContent = "";
  uploadLink.href = "#";
}

function setImage(url) {
  if (!url) return;
  resultImg.src = withCacheBust(url);
}

function closeEventStream() {
  if (!evtSource) return;
  evtSource.close();
  evtSource = null;
}

function setSwitchState(activeView) {
  const qrActive = activeView === "qr";
  showQrViewBtn.classList.toggle("active", qrActive);
  showQrViewBtn.classList.toggle("secondary", !qrActive);
  showWorkspaceViewBtn.classList.toggle("active", !qrActive);
  showWorkspaceViewBtn.classList.toggle("secondary", qrActive);
}

function showQr() {
  qrView.classList.remove("hidden");
  workspaceView.classList.add("hidden");
  setSwitchState("qr");
}

function showWorkspace() {
  qrView.classList.add("hidden");
  workspaceView.classList.remove("hidden");
  setSwitchState("workspace");

  if (!workspaceReady) {
    initWorkspace();
    workspaceReady = true;
  }

  refreshWorkspaceCanvas();
}

async function createSessionQr() {
  clearQrDisplay();
  resultImg.removeAttribute("src");
  setStatus("Creating session...");
  makeQrBtn.disabled = true;

  try {
    const data = await api("/api/session", "GET");
    const sessionId = data.sessionId;

    new globalThis.QRCode(qrDiv, {
      text: data.uploadUrl,
      width: 220,
      height: 220
    });

    uploadLink.href = data.uploadUrl;
    uploadLink.textContent = data.uploadUrl;
    setStatus("Scan the QR code on your phone and upload an image.");

    closeEventStream();
    evtSource = new EventSource(`/api/stream/session/${encodeURIComponent(sessionId)}`);

    evtSource.addEventListener("image", (event) => {
      const message = JSON.parse(event.data);
      setImage(message.publicUrl);
      setStatus("Image received.");
    });

    evtSource.addEventListener("error", () => {
      setStatus("Live updates disconnected. Reload if you need to reconnect.");
    });
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to create a QR session.");
  } finally {
    makeQrBtn.disabled = false;
  }
}

async function init() {
  await initTopbar({ requireAuth: true });

  if (!hasConsent()) {
    window.location.href = "/html/consent.html";
    return;
  }

  timerCtrl = initCountdownTimer();

  const url = new URL(window.location.href);
  const forcedTour = url.searchParams.get("tour") === "1";
  const autoStartTour = forcedTour || !hasTutorial();

  initJoyrideTour({
    autoStart: autoStartTour,
    getTimerCtrl: () => timerCtrl,
    onComplete: () => {
      setTutorial();
      removeCurrentUrlSearchParam("tour");
    }
  });

  showQrViewBtn.addEventListener("click", showQr);
  showWorkspaceViewBtn.addEventListener("click", showWorkspace);
  makeQrBtn.addEventListener("click", createSessionQr);
  window.addEventListener("beforeunload", closeEventStream);

  showQr();
  initChat();
}

init().catch((error) => {
  setStatus(error instanceof Error ? error.message : "Initialization failed.");
});
