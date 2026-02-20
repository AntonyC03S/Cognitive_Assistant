import { api, initTopbar, clearConsent, hasConsent } from "/common.js";

const statusEl = document.getElementById("status");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");

function setStatus(t) { statusEl.textContent = t || ""; }

(async function init() {
  const { user } = await initTopbar({ requireAuth: false });

  // If already logged in, skip login screen
  if (user) {
    window.location.href = hasConsent() ? "/qr.html" : "/consent.html";
    return;
  }

  clearConsent(); // force consent again after a new login
})();

signupBtn.addEventListener("click", async () => {
  try {
    setStatus("Signing up...");
    await api("/api/signup", "POST", {
      username: usernameEl.value.trim(),
      password: passwordEl.value
    });
    clearConsent();
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
    clearConsent();
    window.location.href = "/consent.html";
  } catch (e) {
    setStatus(e.message);
  }
});