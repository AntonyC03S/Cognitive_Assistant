import { clearFlowFlags } from "/common.js";

const backBtn = document.getElementById("backBtn");

// Ensure flow flags are cleared when landing here
clearFlowFlags();

backBtn.addEventListener("click", () => {
  window.location.href = "/login.html";
});