import { initTopbar, hasConsent, setTutorial } from "/common.js";

const btn = document.getElementById("continueBtn");

(async function init() {
  await initTopbar({ requireAuth: true });

  if (!hasConsent()) {
    window.location.href = "/consent.html";
    return;
  }
})();

btn.addEventListener("click", () => {
  setTutorial();
  window.location.href = "/qr.html";
});