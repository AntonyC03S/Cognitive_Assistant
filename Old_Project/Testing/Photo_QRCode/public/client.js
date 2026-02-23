const makeQrBtn = document.getElementById("makeQrBtn");
const qrDiv = document.getElementById("qr");
const statusDiv = document.getElementById("status");
const uploadLink = document.getElementById("uploadLink");
const baseUrlInput = document.getElementById("baseUrl");
const resultImg = document.getElementById("resultImg");

let socket = null;
let currentSessionId = null;

function setStatus(text) {
  statusDiv.textContent = text || "";
}

function clearQr() {
  qrDiv.innerHTML = "";
  uploadLink.textContent = "";
  uploadLink.href = "#";
}

function guessBaseUrl() {
  // If you opened via IP (recommended), this is fine.
  // If you opened via localhost, your phone cannot access it.
  return window.location.origin;
}

baseUrlInput.value = guessBaseUrl();

makeQrBtn.addEventListener("click", async () => {
  clearQr();
  resultImg.removeAttribute("src");
  setStatus("Creating session...");

  const baseUrl = (baseUrlInput.value || "").trim() || guessBaseUrl();

  let sessionId;
  try {
    const resp = await fetch("/api/session");
    const data = await resp.json();
    sessionId = data.sessionId;
  } catch (e) {
    setStatus("Failed to create session.");
    return;
  }

  currentSessionId = sessionId;
  const uploadUrl = `${baseUrl}/upload.html?session=${encodeURIComponent(sessionId)}`;

  // Render QR
  new QRCode(qrDiv, {
    text: uploadUrl,
    width: 220,
    height: 220
  });

  uploadLink.href = uploadUrl;
  uploadLink.textContent = uploadUrl;

  setStatus("Scan the QR on your phone, upload an image, and it will appear here.");

  // Setup socket once
  if (!socket) {
    socket = io();

    socket.on("connect", () => {
      // no-op
    });

    socket.on("imageUploaded", ({ sessionId, imageUrl }) => {
      if (sessionId !== currentSessionId) return;
      // cache-bust so the browser fetches the new file
      resultImg.src = `${imageUrl}?t=${Date.now()}`;
      setStatus("Image received.");
    });

    socket.on("currentImage", ({ sessionId, imageUrl }) => {
      if (sessionId !== currentSessionId) return;
      resultImg.src = `${imageUrl}?t=${Date.now()}`;
      setStatus("Loaded existing image for this session.");
    });

    socket.on("sessionExpired", ({ sessionId }) => {
      if (sessionId !== currentSessionId) return;
      setStatus("This session expired. Generate a new QR.");
    });
  }

  // Join the session room
  socket.emit("joinSession", sessionId);
});
