import { api, clearFlowFlags } from "/common.js";

const STORAGE_KEY = "qrCountdownState_v2";
const DURATION_MS = 30 * 60 * 1000;

function now() { return Date.now(); }
function pad2(n) { return String(n).padStart(2, "0"); }

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

function loadState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function newState() {
  return {
    running: true,
    deadline: now() + DURATION_MS,
    remaining_ms: DURATION_MS
  };
}

async function endToEndingScreen() {
  try {
    await api("/api/logout", "POST");
  } catch {
    // ignore
  }
  clearFlowFlags();
  sessionStorage.removeItem(STORAGE_KEY);
  window.location.href = "/ending.html";
}

export function initCountdownTimer() {
  const timerText = document.getElementById("timerText");
  const pauseBtn = document.getElementById("pauseBtn");
  const endBtn = document.getElementById("endBtn");

  if (!timerText || !pauseBtn || !endBtn) return;

  let state = loadState();
  if (!state) {
    state = newState();
    saveState(state);
  }

  function remainingMs() {
    return state.running ? (state.deadline - now()) : state.remaining_ms;
  }

  function setButtons() {
    pauseBtn.textContent = state.running ? "Pause" : "Resume";
  }

  function render() {
    const rem = remainingMs();
    timerText.textContent = fmt(rem);

    if (rem <= 0) {
      endToEndingScreen();
      return;
    }
  }

  pauseBtn.addEventListener("click", () => {
    if (state.running) {
      state.remaining_ms = Math.max(0, state.deadline - now());
      state.running = false;
    } else {
      state.running = true;
      state.deadline = now() + Math.max(0, state.remaining_ms);
    }
    saveState(state);
    setButtons();
    render();
  });

  endBtn.addEventListener("click", () => {
    endToEndingScreen();
  });

  // If user logs out manually, clear timer state
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem(STORAGE_KEY);
    });
  }

  setButtons();
  render();

  const interval = setInterval(render, 250);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) render();
  });

  return () => clearInterval(interval);
}