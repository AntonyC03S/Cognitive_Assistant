import { api, initTopbar, clearFlowFlags, hasConsent, hasTutorial } from "/js/common.js";

const statusEl = document.getElementById("status");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");

function setStatus(t) { statusEl.textContent = t || ""; }

function routeAfterLogin() {
  if (!hasConsent()) return "/html/consent.html";
  if (!hasTutorial()) return "/html/qr.html?tour=1";
  return "/html/qr.html";
}

async function submitAuth(endpoint, loadingMessage) {
  try {
    setStatus(loadingMessage);
    await api(endpoint, "POST", {
      username: usernameEl.value.trim(),
      password: passwordEl.value
    });
    clearFlowFlags();
    window.location.href = "/html/consent.html";
  } catch (e) {
    setStatus(e.message);
  }
}

(async function init() {
  const { user } = await initTopbar({ requireAuth: false });
  if (user) {
    window.location.href = routeAfterLogin();
    return;
  }
  clearFlowFlags();
})();

signupBtn.addEventListener("click", () => submitAuth("/api/signup", "Signing up..."));
loginBtn.addEventListener("click", () => submitAuth("/api/login", "Logging in..."));