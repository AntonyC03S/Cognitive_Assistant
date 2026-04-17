import { initTopbar, setConsent } from "/js/common.js";

const STORAGE_KEY = "study_consent_v1";

const els = {
  participantId: document.getElementById("participantId"),
  agreeCheckbox: document.getElementById("agreeCheckbox"),
  consentError: document.getElementById("consentError"),
  consentDate: document.getElementById("consentDate"),
  startBtn: document.getElementById("startBtn"),
  devSkipBtn: document.getElementById("devSkipBtn")
};

function showConsentError(message) {
  els.consentError.textContent = message || "";
  els.consentError.classList.toggle("hidden", !message);
}

function saveConsentRecord(record) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch { /* ignore */ }
}

function goNext() {
  setConsent();
  window.location.href = "/html/tutorial.html";
}

function submitConsent() {
  const participantId = els.participantId.value.trim();
  const agree = els.agreeCheckbox.checked;

  if (!agree) {
    showConsentError("Please check the consent agreement box.");
    return;
  }

  showConsentError("");

  const record = {
    participantId,
    agreedAt: new Date().toISOString()
  };

  saveConsentRecord(record);
  goNext();
}

function bindEvents() {
  els.startBtn.addEventListener("click", submitConsent);
  els.devSkipBtn.addEventListener("click", goNext);
}

(async function init() {
  await initTopbar({ requireAuth: true });

  els.consentDate.textContent = "Date: " + new Date().toLocaleDateString();
  bindEvents();
})();
