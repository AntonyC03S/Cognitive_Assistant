import { initTopbar, setConsent } from "/js/common.js";

const okBtn = document.getElementById("okBtn");

(async function init() {
  await initTopbar({ requireAuth: true });
})();

okBtn.addEventListener("click", () => {
  setConsent();
  window.location.href = "/html/tutorial.html";
});
