import { clearFlowFlags } from "/js/common.js";

const backBtn = document.getElementById("backBtn");

// Ensure flow flags are cleared when landing here
clearFlowFlags();

backBtn.addEventListener("click", () => {
  window.location.href = "/html/login.html";
});