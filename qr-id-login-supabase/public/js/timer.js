import { api, clearFlowFlags } from "/js/common.js";

const STORAGE_KEY = "qrCountdownState_v4";
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
  return { running: true, deadline: now() + DURATION_MS, remaining_ms: DURATION_MS };
}

async function endToEndingScreen() {
  try { await api("/api/logout", "POST"); } catch {}
  clearFlowFlags();
  sessionStorage.removeItem(STORAGE_KEY);
  window.location.href = "/html/ending.html";
}

export function initCountdownTimer() {
  const timerText = document.getElementById("timerText");
  const pauseBtn = document.getElementById("pauseBtn");
  const endBtn = document.getElementById("endBtn");

  if (!timerText || !pauseBtn || !endBtn) return null;

  let state = loadState() || newState();
  saveState(state);

  function remainingMs() {
    return state.running ? (state.deadline - now()) : state.remaining_ms;
  }

  function setButtons() {
    pauseBtn.textContent = state.running ? "Pause" : "Resume";
  }

  function render() {
    const rem = remainingMs();
    timerText.textContent = fmt(rem);
    if (rem <= 0) endToEndingScreen();
  }

  function pause() {
    if (!state.running) return;
    state.remaining_ms = Math.max(0, state.deadline - now());
    state.running = false;
    saveState(state);
    setButtons();
    render();
  }

  function resume() {
    if (state.running) return;
    state.running = true;
    state.deadline = now() + Math.max(0, state.remaining_ms);
    saveState(state);
    setButtons();
    render();
  }

  function isRunning() {
    return !!state.running;
  }

  function togglePause() {
    if (state.running) pause();
    else resume();
  }

  function end() {
    endToEndingScreen();
  }

  pauseBtn.addEventListener("click", togglePause);
  endBtn.addEventListener("click", end);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => sessionStorage.removeItem(STORAGE_KEY));

  setButtons();
  render();

  const interval = setInterval(render, 250);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });

  return { pause, resume, end, isRunning, stop: () => clearInterval(interval) };
}