import { initTopbar, setConsent } from "/common.js";

const okBtn = document.getElementById("okBtn");

(async function init() {
  await initTopbar({ requireAuth: true });
})();

okBtn.addEventListener("click", () => {
  setConsent();
  window.location.href = "/qr.html";
});