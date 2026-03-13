export function startTour({ steps, onFinish, onSkip } = {}) {
  if (!Array.isArray(steps) || steps.length === 0) return;

  // Build overlay once
  let root = document.getElementById("tourRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "tourRoot";
    root.className = "tourRoot";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");

    root.innerHTML = `
      <div id="tourHole" class="tourHole"></div>
      <div id="tourCard" class="tourCard">
        <div class="tourTop">
          <div id="tourTitle" class="tourTitle"></div>
          <button id="tourSkipX" class="tourX" aria-label="Close tutorial">×</button>
        </div>
        <div id="tourBody" class="tourBody"></div>
        <div class="tourBottom">
          <div id="tourStepText" class="tourStepText"></div>
          <div class="tourBtns">
            <button id="tourBack" class="button small secondary">Back</button>
            <button id="tourNext" class="button small">Next</button>
            <button id="tourSkip" class="button small secondary">Skip</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);
  }

  const hole = document.getElementById("tourHole");
  const card = document.getElementById("tourCard");
  const titleEl = document.getElementById("tourTitle");
  const bodyEl = document.getElementById("tourBody");
  const stepEl = document.getElementById("tourStepText");
  const backBtn = document.getElementById("tourBack");
  const nextBtn = document.getElementById("tourNext");
  const skipBtn = document.getElementById("tourSkip");
  const skipXBtn = document.getElementById("tourSkipX");

  let idx = 0;
  let raf = null;

  function cleanup() {
    window.removeEventListener("resize", position);
    window.removeEventListener("scroll", position, true);
    document.removeEventListener("keydown", onKeyDown);
    if (raf) cancelAnimationFrame(raf);
    root.remove();
  }

  function end(kind) {
    cleanup();
    if (kind === "finish") onFinish?.();
    else onSkip?.();
  }

  function onKeyDown(e) {
    if (e.key === "Escape") end("skip");
    if (e.key === "ArrowRight") goNext();
    if (e.key === "ArrowLeft") goBack();
  }

  function getTargetRect(step) {
    const el = step?.selector ? document.querySelector(step.selector) : null;
    if (!el) return null;

    // Make sure it is on screen
    try {
      el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    } catch {}

    return el.getBoundingClientRect();
  }

  function setHole(rect) {
    const pad = 10;

    if (!rect) {
      // fallback center hole
      const w = 260, h = 80;
      const left = Math.max(16, (window.innerWidth - w) / 2);
      const top = Math.max(16, (window.innerHeight - h) / 2);
      hole.style.left = `${left}px`;
      hole.style.top = `${top}px`;
      hole.style.width = `${w}px`;
      hole.style.height = `${h}px`;
      return;
    }

    const left = Math.max(8, rect.left - pad);
    const top = Math.max(8, rect.top - pad);
    const width = Math.min(window.innerWidth - 16, rect.width + pad * 2);
    const height = Math.min(window.innerHeight - 16, rect.height + pad * 2);

    hole.style.left = `${left}px`;
    hole.style.top = `${top}px`;
    hole.style.width = `${width}px`;
    hole.style.height = `${height}px`;
  }

  function setCard(rect) {
    const margin = 14;

    // Default center if no rect
    if (!rect) {
      card.style.left = `${Math.max(16, (window.innerWidth - card.offsetWidth) / 2)}px`;
      card.style.top = `${Math.max(16, (window.innerHeight - card.offsetHeight) / 2)}px`;
      return;
    }

    // Try below, otherwise above, otherwise center
    const belowSpace = window.innerHeight - rect.bottom;
    const aboveSpace = rect.top;

    const cardW = card.offsetWidth;
    const cardH = card.offsetHeight;

    // x position near target, clamped
    let left = rect.left;
    left = Math.min(left, window.innerWidth - cardW - 16);
    left = Math.max(16, left);

    let top;

    if (belowSpace >= cardH + margin) {
      top = rect.bottom + margin;
    } else if (aboveSpace >= cardH + margin) {
      top = rect.top - cardH - margin;
    } else {
      // center
      left = Math.max(16, (window.innerWidth - cardW) / 2);
      top = Math.max(16, (window.innerHeight - cardH) / 2);
    }

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function position() {
    const step = steps[idx];
    const rect = getTargetRect(step);

    // Wait a frame so scrollIntoView can settle
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r2 = rect ? getTargetRect(step) : null;
      setHole(r2);
      setCard(r2);
    });
  }

  function render() {
    const step = steps[idx];

    titleEl.textContent = step.title || "";
    bodyEl.textContent = step.body || "";
    stepEl.textContent = `Step ${idx + 1} / ${steps.length}`;

    backBtn.disabled = idx === 0;
    nextBtn.textContent = idx === steps.length - 1 ? "Finish" : "Next";

    // size/position after content set
    position();
  }

  function goNext() {
    if (idx >= steps.length - 1) {
      end("finish");
      return;
    }
    idx += 1;
    render();
  }

  function goBack() {
    if (idx <= 0) return;
    idx -= 1;
    render();
  }

  backBtn.onclick = goBack;
  nextBtn.onclick = goNext;
  skipBtn.onclick = () => end("skip");
  skipXBtn.onclick = () => end("skip");

  window.addEventListener("resize", position);
  window.addEventListener("scroll", position, true);
  document.addEventListener("keydown", onKeyDown);

  render();
}