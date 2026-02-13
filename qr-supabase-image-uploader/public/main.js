const authStatus = document.getElementById("authStatus");
const appSection = document.getElementById("appSection");

const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const galleryLink = document.getElementById("galleryLink");

const makeQrBtn = document.getElementById("makeQrBtn");
const qrDiv = document.getElementById("qr");
const statusDiv = document.getElementById("status");
const uploadLink = document.getElementById("uploadLink");
const resultImg = document.getElementById("resultImg");

let currentSessionId = null;
let evtSource = null;

function setAuthStatus(t) { authStatus.textContent = t || ""; }
function setStatus(t) { statusDiv.textContent = t || ""; }

function setLoggedInUI(isIn, who) {
  appSection.style.display = isIn ? "block" : "none";
  logoutBtn.style.display = isIn ? "inline-block" : "none";
  galleryLink.style.display = isIn ? "inline-block" : "none";
  setAuthStatus(isIn ? `Logged in as: ${who}` : "Not logged in.");
}

function clearQr() {
  qrDiv.innerHTML = "";
  uploadLink.textContent = "";
  uploadLink.href = "#";
}

function setImage(url) {
  if (!url) return;
  resultImg.src = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

async function api(path, method, body) {
  const resp = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function refreshMe() {
  const data = await api("/api/me", "GET");
  if (data.user) setLoggedInUI(true, data.user.username);
  else setLoggedInUI(false, "");
}

signupBtn.addEventListener("click", async () => {
  try {
    setAuthStatus("Signing up...");
    await api("/api/signup", "POST", {
      username: usernameEl.value.trim(),
      password: passwordEl.value
    });
    await refreshMe();
  } catch (e) {
    setAuthStatus(e.message);
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    setAuthStatus("Logging in...");
    await api("/api/login", "POST", {
      username: usernameEl.value.trim(),
      password: passwordEl.value
    });
    await refreshMe();
  } catch (e) {
    setAuthStatus(e.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await api("/api/logout", "POST");
    if (evtSource) evtSource.close();
    evtSource = null;
    currentSessionId = null;
    clearQr();
    setStatus("");
    resultImg.removeAttribute("src");
    await refreshMe();
  } catch (e) {
    setAuthStatus(e.message);
  }
});

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
  } catch (e) {
    setStatus(e.message);
  }
});

refreshMe();
