import { api, clearConsent } from "/common.js";

const STORAGE_KEY = "qrCountdownState_v1";
const DURATION_MS = 10000;//30 * 60 * 1000;

function now() {
  return Date.now();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

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
  // deadline is an absolute timestamp; pause stores remaining_ms
  return {
    running: true,
    deadline: now() + DURATION_MS,
    remaining_ms: DURATION_MS
  };
}

async function doLogout() {
  try {
    await api("/api/logout", "POST");
  } catch {
    // ignore
  }
  clearConsent();
  sessionStorage.removeItem(STORAGE_KEY);
  window.location.href = "/login.html";
}

export function initCountdownTimer() {
  const timerText = document.getElementById("timerText");
  const pauseBtn = document.getElementById("pauseBtn");

  if (!timerText || !pauseBtn) return;

  let state = loadState();
  if (!state) {
    state = newState();
    saveState(state);
  }

  function getRemainingMs() {
    if (state.running) {
      return state.deadline - now();
    }
    return state.remaining_ms;
  }

  function render() {
    const remaining = getRemainingMs();
    timerText.textContent = fmt(remaining);

    if (remaining <= 0) {
      doLogout();
      return;
    }
  }

  function setButton() {
    pauseBtn.textContent = state.running ? "Pause" : "Resume";
  }

  pauseBtn.addEventListener("click", () => {
    if (state.running) {
      // pause
      state.remaining_ms = Math.max(0, state.deadline - now());
      state.running = false;
    } else {
      // resume
      state.running = true;
      state.deadline = now() + Math.max(0, state.remaining_ms);
    }
    saveState(state);
    setButton();
    render();
  });

  // If user manually logs out, stop/clear timer
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem(STORAGE_KEY);
    });
  }

  setButton();
  render();

  // Tick every 250ms for smoothness, but only update text every tick anyway
  const interval = setInterval(render, 250);

  // If the tab is hidden and comes back, render immediately
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) render();
  });

  // Return a cleanup if needed
  return () => clearInterval(interval);
}