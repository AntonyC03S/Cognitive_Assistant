import { api, initTopbar, clearFlowFlags, hasConsent, hasTutorial } from "/common.js";

const statusEl = document.getElementById("status");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");

function setStatus(t) { statusEl.textContent = t || ""; }

function routeAfterLogin() {
  if (!hasConsent()) return "/consent.html";
  if (!hasTutorial()) return "/tutorial.html";
  return "/qr.html";
}

(async function init() {
  const { user } = await initTopbar({ requireAuth: false });

  if (user) {
    window.location.href = routeAfterLogin();
    return;
  }

  clearFlowFlags();
})();

signupBtn.addEventListener("click", async () => {
  try {
    setStatus("Signing up...");
    await api("/api/signup", "POST", {
      username: usernameEl.value.trim(),
      password: passwordEl.value
    });
    clearFlowFlags();
    window.location.href = "/consent.html";
  } catch (e) {
    setStatus(e.message);
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    setStatus("Logging in...");
    await api("/api/login", "POST", {
      username: usernameEl.value.trim(),
      password: passwordEl.value
    });
    clearFlowFlags();
    window.location.href = "/consent.html";
  } catch (e) {
    setStatus(e.message);
  }
});