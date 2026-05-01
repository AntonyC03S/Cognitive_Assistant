import { initTopbar, hasConsent } from "/js/common.js";

const btn = document.getElementById("continueBtn");

(async function init() {
  await initTopbar({ requireAuth: true });

  if (!hasConsent()) {
    window.location.href = "/html/consent.html";
    return;
  }
})();

btn.addEventListener("click", () => {
  window.location.href = "/html/qr.html";
});