import { initTopbar, hasConsent } from "/js/common.js";

const btn = document.getElementById("continueBtn");

(async function init() {
  // Tutorial page requires an authenticated user for the guided flow.
  await initTopbar({ requireAuth: true });

  // If consent is missing, send user back to consent first.
  if (!hasConsent()) {
    window.location.href = "/html/consent.html";
    return;
  }
})();

btn.addEventListener("click", () => {
  // Move to the main QR page; tour auto-start is handled there.
  window.location.href = "/html/qr.html";
});