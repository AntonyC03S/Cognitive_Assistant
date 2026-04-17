// Whiteboard + Collage workspace, moved from whiteboard.html.
// Consent logic lives in consent.js. Call initWorkspace() when the
// workspace view is first shown, then showWorkspace() on later toggles.

const state = {
  tab: "whiteboard",

  wbMode: "draw",
  wbTool: "draw",
  wbColor: "#111827",
  wbSize: 4,
  wbIsDrawing: false,
  wbHistory: [],
  wbHistoryIndex: -1,
  wbTextBoxes: [],
  wbActiveTextId: null,
  wbDrag: {
    dragging: false,
    id: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0
  },

  colMode: "draw",
  colTool: "draw",
  colColor: "#111827",
  colSize: 4,
  colIsDrawing: false,
  colHistory: [],
  colHistoryIndex: -1,
  colImages: [],
  colActiveImageId: null,
  colDrag: {
    dragging: false,
    resizing: false,
    id: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    origW: 0,
    origH: 0
  }
};

let els = null;
let initialized = false;

function $(id) { return document.getElementById(id); }

function bindEls() {
  els = {
    tabWhiteboardBtn: $("tabWhiteboardBtn"),
    tabCollageBtn: $("tabCollageBtn"),
    whiteboardPanel: $("whiteboardPanel"),
    collagePanel: $("collagePanel"),

    wbContainer: $("wbContainer"),
    wbCanvas: $("wbCanvas"),
    wbTextLayer: $("wbTextLayer"),
    wbDrawBtn: $("wbDrawBtn"),
    wbEraseBtn: $("wbEraseBtn"),
    wbTextBtn: $("wbTextBtn"),
    wbClearBtn: $("wbClearBtn"),
    wbColor: $("wbColor"),
    wbSize: $("wbSize"),
    wbSizeValue: $("wbSizeValue"),
    wbUndoBtn: $("wbUndoBtn"),
    wbRedoBtn: $("wbRedoBtn"),
    wbAddTextBtn: $("wbAddTextBtn"),
    wbDeleteTextBtn: $("wbDeleteTextBtn"),
    wbExportBtn: $("wbExportBtn"),
    wbModeLabel: $("wbModeLabel"),

    colContainer: $("colContainer"),
    colCanvas: $("colCanvas"),
    colImageLayer: $("colImageLayer"),
    colDrawBtn: $("colDrawBtn"),
    colEraseBtn: $("colEraseBtn"),
    colArrangeBtn: $("colArrangeBtn"),
    colClearBtn: $("colClearBtn"),
    colColor: $("colColor"),
    colSize: $("colSize"),
    colSizeValue: $("colSizeValue"),
    colUndoBtn: $("colUndoBtn"),
    colRedoBtn: $("colRedoBtn"),
    colFileInput: $("colFileInput"),
    webImageUrl: $("webImageUrl"),
    webImageError: $("webImageError"),
    addUrlImageBtn: $("addUrlImageBtn"),
    colArrangeModeBtn: $("colArrangeModeBtn"),
    colDeleteImageBtn: $("colDeleteImageBtn"),
    colExportBtn: $("colExportBtn"),
    colModeLabel: $("colModeLabel")
  };
}

function uid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return String(Date.now() + Math.random());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function downloadDataUrl(filename, dataUrl) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function getPointerPos(event, element) {
  const rect = element.getBoundingClientRect();
  const point = event.touches && event.touches[0] ? event.touches[0] : event;
  return {
    x: point.clientX - rect.left,
    y: point.clientY - rect.top
  };
}

function fillCanvasWhite(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function resizeCanvasToContainer(canvas, container, fillWhite) {
  if (!canvas || !container) return;
  const rect = container.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  let prev = null;

  try { prev = canvas.toDataURL("image/png"); } catch { prev = null; }

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (fillWhite) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  if (prev) {
    const img = new Image();
    img.onload = function () {
      if (fillWhite) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = prev;
  }
}

function renderTab() {
  const isWhiteboard = state.tab === "whiteboard";
  els.whiteboardPanel.classList.toggle("hidden", !isWhiteboard);
  els.collagePanel.classList.toggle("hidden", isWhiteboard);
  els.tabWhiteboardBtn.classList.toggle("active", isWhiteboard);
  els.tabCollageBtn.classList.toggle("active", !isWhiteboard);
}

function setTab(tab) {
  state.tab = tab;
  renderTab();
  requestAnimationFrame(function () {
    resizeWhiteboardCanvas();
    resizeCollageCanvas();
    renderWhiteboardTextBoxes();
    renderCollageImages();
  });
}

function resizeWhiteboardCanvas() {
  if (!els.wbContainer || !els.wbCanvas) return;
  resizeCanvasToContainer(els.wbCanvas, els.wbContainer, false);
}

function wbPushHistory() {
  try {
    const data = els.wbCanvas.toDataURL("image/png");
    const next = state.wbHistory.slice(0, state.wbHistoryIndex + 1);
    next.push(data);
    if (next.length > 50) next.shift();
    state.wbHistory = next;
    state.wbHistoryIndex = next.length - 1;
  } catch { /* ignore */ }
}

function wbRestore(index) {
  const data = state.wbHistory[index];
  if (!data) return;
  const ctx = els.wbCanvas.getContext("2d");
  if (!ctx) return;
  const img = new Image();
  img.onload = function () {
    ctx.clearRect(0, 0, els.wbCanvas.width, els.wbCanvas.height);
    ctx.drawImage(img, 0, 0, els.wbCanvas.width, els.wbCanvas.height);
  };
  img.src = data;
}

function setWhiteboardMode(mode, tool) {
  state.wbMode = mode;
  if (tool) state.wbTool = tool;
  els.wbDrawBtn.classList.toggle("active", state.wbMode === "draw" && state.wbTool === "draw");
  els.wbEraseBtn.classList.toggle("active", state.wbMode === "draw" && state.wbTool === "erase");
  els.wbTextBtn.classList.toggle("active", state.wbMode === "text");
  els.wbCanvas.style.pointerEvents = state.wbMode === "draw" ? "auto" : "none";
  els.wbModeLabel.textContent = "Mode: " + state.wbMode;
  renderWhiteboardTextBoxes();
}

function updateWhiteboardSize() {
  els.wbSizeValue.textContent = String(state.wbSize) + "px";
}

function wbGetPos(event) { return getPointerPos(event, els.wbCanvas); }

function wbPointerDown(event) {
  if (state.wbMode !== "draw") return;
  event.preventDefault();
  state.wbActiveTextId = null;
  renderWhiteboardTextBoxes();
  state.wbIsDrawing = true;
  const pos = wbGetPos(event);
  const ctx = els.wbCanvas.getContext("2d");
  if (!ctx) return;
  ctx.beginPath();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = state.wbSize;
  ctx.strokeStyle = state.wbTool === "erase" ? "#ffffff" : state.wbColor;
  ctx.moveTo(pos.x, pos.y);
}

function wbPointerMove(event) {
  if (state.wbMode !== "draw" || !state.wbIsDrawing) return;
  event.preventDefault();
  const pos = wbGetPos(event);
  const ctx = els.wbCanvas.getContext("2d");
  if (!ctx) return;
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function wbPointerUp(event) {
  if (state.wbMode !== "draw" || !state.wbIsDrawing) return;
  if (event && typeof event.preventDefault === "function") event.preventDefault();
  state.wbIsDrawing = false;
  const ctx = els.wbCanvas.getContext("2d");
  if (ctx) ctx.closePath();
  wbPushHistory();
}

function wbClear() {
  const ctx = els.wbCanvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, els.wbCanvas.width, els.wbCanvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, els.wbCanvas.width, els.wbCanvas.height);
  wbPushHistory();
}

function wbUndo() {
  if (state.wbHistoryIndex <= 0) return;
  state.wbHistoryIndex -= 1;
  wbRestore(state.wbHistoryIndex);
}

function wbRedo() {
  if (state.wbHistoryIndex >= state.wbHistory.length - 1) return;
  state.wbHistoryIndex += 1;
  wbRestore(state.wbHistoryIndex);
}

function wbUpdateTextBox(id, patch) {
  state.wbTextBoxes = state.wbTextBoxes.map(function (box) {
    return box.id === id ? Object.assign({}, box, patch) : box;
  });
  renderWhiteboardTextBoxes();
}

function wbAddTextBox() {
  setWhiteboardMode("text");
  const rect = els.wbContainer.getBoundingClientRect();
  const id = uid();
  state.wbTextBoxes.push({
    id: id,
    x: Math.max(16, rect.width * 0.1),
    y: Math.max(16, rect.height * 0.1),
    w: Math.min(320, Math.max(180, rect.width - 32)),
    h: 120,
    text: "Type here...",
    fontSize: 18,
    hasTyped: false,
    hideBorder: false
  });
  state.wbActiveTextId = id;
  renderWhiteboardTextBoxes();
}

function wbDeleteActiveTextBox() {
  if (!state.wbActiveTextId) return;
  state.wbTextBoxes = state.wbTextBoxes.filter(function (box) {
    return box.id !== state.wbActiveTextId;
  });
  state.wbActiveTextId = null;
  renderWhiteboardTextBoxes();
}

function focusEditableTextBox(id) {
  const node = els.wbTextLayer.querySelector('[data-text-edit-id="' + id + '"]');
  if (!node) return;
  node.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function renderWhiteboardTextBoxes() {
  els.wbDeleteTextBtn.disabled = !state.wbActiveTextId;
  els.wbTextLayer.innerHTML = "";
  const interactive = state.wbMode === "text";

  state.wbTextBoxes.forEach(function (box) {
    const active = box.id === state.wbActiveTextId;
    const root = document.createElement("div");
    root.className = "text-box" + (active ? " active" : "") + (box.hideBorder ? " no-border" : "");
    root.style.left = box.x + "px";
    root.style.top = box.y + "px";
    root.style.width = box.w + "px";
    root.style.height = box.h + "px";
    root.style.pointerEvents = interactive ? "auto" : "none";
    root.dataset.id = box.id;

    const inner = document.createElement("div");
    inner.className = "text-box-inner";

    if (active && interactive) {
      const drag = document.createElement("div");
      drag.className = "drag-handle";
      drag.dataset.dragHandle = "1";
      drag.title = "Drag to move";
      drag.textContent = "Drag";
      inner.appendChild(drag);
    }

    const editable = document.createElement("div");
    editable.className = "editable";
    editable.dataset.textEditId = box.id;
    editable.style.fontSize = box.fontSize + "px";
    editable.style.height = active && interactive ? "calc(100% - 28px)" : "100%";
    editable.contentEditable = interactive ? "true" : "false";
    editable.spellcheck = false;
    editable.innerHTML = escapeHtml(box.text).replace(/\n/g, "<br>");

    editable.addEventListener("mousedown", function (event) { event.stopPropagation(); });
    editable.addEventListener("focus", function () {
      state.wbActiveTextId = box.id;
      renderWhiteboardTextBoxes();
    });
    editable.addEventListener("input", function (event) {
      wbUpdateTextBox(box.id, {
        text: event.currentTarget.innerText || "",
        hasTyped: true
      });
    });
    editable.addEventListener("blur", function () {
      const found = state.wbTextBoxes.find(function (item) { return item.id === box.id; });
      if (found && found.hasTyped) {
        wbUpdateTextBox(box.id, { hideBorder: true });
      }
    });

    root.addEventListener("mousedown", function (event) {
      if (!interactive) return;
      event.stopPropagation();
      state.wbActiveTextId = box.id;

      const handle = event.target.closest('[data-drag-handle="1"]');
      if (!handle) {
        renderWhiteboardTextBoxes();
        return;
      }

      event.preventDefault();
      state.wbDrag = {
        dragging: true,
        id: box.id,
        startX: event.clientX,
        startY: event.clientY,
        origX: box.x,
        origY: box.y
      };
      renderWhiteboardTextBoxes();
    });

    inner.appendChild(editable);
    root.appendChild(inner);

    if (active && interactive) {
      const badge = document.createElement("div");
      badge.className = "text-badge";
      badge.textContent = "T";
      root.appendChild(badge);
    }

    els.wbTextLayer.appendChild(root);
  });
}

function wbContainerMouseMove(event) {
  if (!state.wbDrag.dragging) return;
  const rect = els.wbContainer.getBoundingClientRect();
  const drag = state.wbDrag;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  const box = state.wbTextBoxes.find(function (item) { return item.id === drag.id; });
  if (!box) return;

  wbUpdateTextBox(drag.id, {
    x: Math.min(Math.max(0, drag.origX + dx), Math.max(0, rect.width - box.w)),
    y: Math.min(Math.max(0, drag.origY + dy), Math.max(0, rect.height - box.h))
  });
}

function wbContainerMouseUp() {
  state.wbDrag.dragging = false;
}

function renderWrappedText(ctx, text, x, y, w, h, fontSize) {
  const raw = String(text || "").split("\n").join(" \\n ");
  const parts = raw.split(" ").filter(Boolean);
  const lines = [];
  let line = "";

  for (let i = 0; i < parts.length; i += 1) {
    const word = parts[i];
    if (word === "\\n") {
      lines.push(line.trimEnd());
      line = "";
      continue;
    }
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width <= w) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);

  const lineHeight = Math.round(fontSize * 1.25);
  let yy = y;
  for (let i = 0; i < lines.length; i += 1) {
    if (yy + lineHeight > y + h) break;
    ctx.fillText(lines[i], x, yy);
    yy += lineHeight;
  }
}

function wbExportPNG() {
  const out = document.createElement("canvas");
  out.width = els.wbCanvas.width;
  out.height = els.wbCanvas.height;
  const ctx = out.getContext("2d");
  if (!ctx) return;

  ctx.drawImage(els.wbCanvas, 0, 0);
  state.wbTextBoxes.forEach(function (box) {
    const fontSize = box.fontSize || 18;
    ctx.save();
    ctx.fillStyle = "#111827";
    ctx.font = fontSize + "px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
    ctx.textBaseline = "top";
    renderWrappedText(
      ctx,
      box.text,
      box.x + 10,
      box.y + 10,
      Math.max(20, box.w - 20),
      Math.max(20, box.h - 20),
      fontSize
    );
    ctx.restore();
  });

  downloadDataUrl("whiteboard.png", out.toDataURL("image/png"));
}

function resizeCollageCanvas() {
  if (!els.colContainer || !els.colCanvas) return;
  resizeCanvasToContainer(els.colCanvas, els.colContainer, false);
}

function colPushHistory() {
  try {
    const data = els.colCanvas.toDataURL("image/png");
    const next = state.colHistory.slice(0, state.colHistoryIndex + 1);
    next.push(data);
    if (next.length > 50) next.shift();
    state.colHistory = next;
    state.colHistoryIndex = next.length - 1;
  } catch { /* ignore */ }
}

function colRestore(index) {
  const data = state.colHistory[index];
  if (!data) return;
  const ctx = els.colCanvas.getContext("2d");
  if (!ctx) return;
  const img = new Image();
  img.onload = function () {
    ctx.clearRect(0, 0, els.colCanvas.width, els.colCanvas.height);
    ctx.drawImage(img, 0, 0, els.colCanvas.width, els.colCanvas.height);
  };
  img.src = data;
}

function setCollageMode(mode, tool) {
  state.colMode = mode;
  if (tool) state.colTool = tool;
  els.colDrawBtn.classList.toggle("active", state.colMode === "draw" && state.colTool === "draw");
  els.colEraseBtn.classList.toggle("active", state.colMode === "draw" && state.colTool === "erase");
  els.colArrangeBtn.classList.toggle("active", state.colMode === "objects");
  els.colArrangeModeBtn.classList.toggle("btn-primary", state.colMode === "objects");
  els.colArrangeModeBtn.classList.toggle("btn-ghost", state.colMode !== "objects");
  els.colCanvas.style.pointerEvents = state.colMode === "draw" ? "auto" : "none";
  els.colModeLabel.textContent = "Mode: " + state.colMode;
  renderCollageImages();
}

function updateCollageSize() {
  els.colSizeValue.textContent = String(state.colSize) + "px";
}

function colGetPos(event) { return getPointerPos(event, els.colCanvas); }

function colPointerDown(event) {
  if (state.colMode !== "draw") return;
  event.preventDefault();
  state.colIsDrawing = true;
  const pos = colGetPos(event);
  const ctx = els.colCanvas.getContext("2d");
  if (!ctx) return;
  ctx.beginPath();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = state.colSize;
  ctx.strokeStyle = state.colTool === "erase" ? "#ffffff" : state.colColor;
  ctx.moveTo(pos.x, pos.y);
}

function colPointerMove(event) {
  if (state.colMode !== "draw" || !state.colIsDrawing) return;
  event.preventDefault();
  const pos = colGetPos(event);
  const ctx = els.colCanvas.getContext("2d");
  if (!ctx) return;
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function colPointerUp(event) {
  if (state.colMode !== "draw" || !state.colIsDrawing) return;
  if (event && typeof event.preventDefault === "function") event.preventDefault();
  state.colIsDrawing = false;
  const ctx = els.colCanvas.getContext("2d");
  if (ctx) ctx.closePath();
  colPushHistory();
}

function colClear() {
  const ctx = els.colCanvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, els.colCanvas.width, els.colCanvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, els.colCanvas.width, els.colCanvas.height);
  colPushHistory();
}

function colUndo() {
  if (state.colHistoryIndex <= 0) return;
  state.colHistoryIndex -= 1;
  colRestore(state.colHistoryIndex);
}

function colRedo() {
  if (state.colHistoryIndex >= state.colHistory.length - 1) return;
  state.colHistoryIndex += 1;
  colRestore(state.colHistoryIndex);
}

function colUpdateImage(id, patch) {
  state.colImages = state.colImages.map(function (img) {
    return img.id === id ? Object.assign({}, img, patch) : img;
  });
  renderCollageImages();
}

function renderCollageImages() {
  const interactive = state.colMode === "objects";
  els.colDeleteImageBtn.disabled = !state.colActiveImageId;
  els.colImageLayer.innerHTML = "";

  state.colImages.forEach(function (imgObj) {
    const active = imgObj.id === state.colActiveImageId;
    const root = document.createElement("div");
    root.className = "image-object" + (active ? " active" : "");
    root.style.left = imgObj.x + "px";
    root.style.top = imgObj.y + "px";
    root.style.width = imgObj.w + "px";
    root.style.height = imgObj.h + "px";
    root.style.pointerEvents = interactive ? "auto" : "none";
    root.title = imgObj.name || "collage";
    root.dataset.id = imgObj.id;

    const image = document.createElement("img");
    image.src = imgObj.src;
    image.alt = "collage";
    image.draggable = false;
    image.crossOrigin = "anonymous";
    root.appendChild(image);

    if (active && interactive) {
      const handle = document.createElement("div");
      handle.className = "resize-handle";
      handle.dataset.resizeHandle = "1";
      handle.title = "Resize";
      root.appendChild(handle);
    }

    root.addEventListener("mousedown", function (event) {
      if (!interactive) return;
      const resizeHandle = event.target.closest('[data-resize-handle="1"]');
      event.stopPropagation();
      event.preventDefault();
      state.colActiveImageId = imgObj.id;
      state.colDrag = {
        dragging: !resizeHandle,
        resizing: !!resizeHandle,
        id: imgObj.id,
        startX: event.clientX,
        startY: event.clientY,
        origX: imgObj.x,
        origY: imgObj.y,
        origW: imgObj.w,
        origH: imgObj.h
      };
      renderCollageImages();
    });

    els.colImageLayer.appendChild(root);
  });
}

function colContainerMouseMove(event) {
  if (state.colMode !== "objects") return;
  const drag = state.colDrag;
  if (!drag.dragging && !drag.resizing) return;
  const rect = els.colContainer.getBoundingClientRect();
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  const obj = state.colImages.find(function (item) { return item.id === drag.id; });
  if (!obj) return;

  if (drag.dragging) {
    colUpdateImage(drag.id, {
      x: Math.min(Math.max(0, drag.origX + dx), Math.max(0, rect.width - obj.w)),
      y: Math.min(Math.max(0, drag.origY + dy), Math.max(0, rect.height - obj.h))
    });
    return;
  }

  if (drag.resizing) {
    colUpdateImage(drag.id, {
      w: Math.min(Math.max(80, drag.origW + dx), Math.max(80, rect.width - drag.origX)),
      h: Math.min(Math.max(60, drag.origH + dy), Math.max(60, rect.height - drag.origY))
    });
  }
}

function colContainerMouseUp() {
  state.colDrag.dragging = false;
  state.colDrag.resizing = false;
}

function colDeleteActiveImage() {
  if (!state.colActiveImageId) return;
  state.colImages = state.colImages.filter(function (img) {
    return img.id !== state.colActiveImageId;
  });
  state.colActiveImageId = null;
  renderCollageImages();
}

function colAddImageFromFile(file) {
  const rect = els.colContainer.getBoundingClientRect();
  const reader = new FileReader();
  reader.onload = function (event) {
    state.colImages.push({
      id: uid(),
      src: String(event.target && event.target.result ? event.target.result : ""),
      name: file.name,
      x: Math.max(16, rect.width * 0.1),
      y: Math.max(16, rect.height * 0.1),
      w: Math.min(320, Math.max(160, rect.width * 0.35)),
      h: Math.min(240, Math.max(120, rect.height * 0.25))
    });
    setCollageMode("objects");
    renderCollageImages();
  };
  reader.readAsDataURL(file);
}

function showWebImageError(message) {
  els.webImageError.textContent = message || "";
  els.webImageError.classList.toggle("hidden", !message);
}

function colAddImageFromUrl() {
  const url = els.webImageUrl.value.trim();
  if (!/^https?:\/\//i.test(url)) {
    showWebImageError("Please paste a full http(s) image URL.");
    return;
  }

  showWebImageError("");
  const rect = els.colContainer.getBoundingClientRect();
  const id = uid();

  state.colImages.push({
    id: id,
    src: url,
    name: "Web image",
    x: Math.max(16, rect.width * 0.1),
    y: Math.max(16, rect.height * 0.1),
    w: Math.min(360, Math.max(160, rect.width * 0.4)),
    h: Math.min(260, Math.max(120, rect.height * 0.28))
  });

  state.colActiveImageId = id;
  els.webImageUrl.value = "";
  setCollageMode("objects");
  renderCollageImages();
}

async function colExportPNG() {
  const out = document.createElement("canvas");
  out.width = els.colCanvas.width;
  out.height = els.colCanvas.height;
  const ctx = out.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("failed")); };
      img.src = src;
    });
  }

  for (let i = 0; i < state.colImages.length; i += 1) {
    const item = state.colImages[i];
    try {
      const img = await loadImage(item.src);
      ctx.drawImage(img, item.x, item.y, item.w, item.h);
    } catch {
      ctx.save();
      ctx.fillStyle = "rgba(239,68,68,0.10)";
      ctx.strokeStyle = "rgba(239,68,68,0.35)";
      ctx.lineWidth = 2;
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.strokeRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = "rgba(239,68,68,0.9)";
      ctx.font = "12px ui-sans-serif, system-ui";
      ctx.fillText("Image blocked (CORS)", item.x + 10, item.y + 18);
      ctx.restore();
    }
  }

  ctx.drawImage(els.colCanvas, 0, 0);
  downloadDataUrl("collage.png", out.toDataURL("image/png"));
}

function bindTabEvents() {
  els.tabWhiteboardBtn.addEventListener("click", function () { setTab("whiteboard"); });
  els.tabCollageBtn.addEventListener("click", function () { setTab("collage"); });
}

function bindWhiteboardEvents() {
  els.wbDrawBtn.addEventListener("click", function () { setWhiteboardMode("draw", "draw"); });
  els.wbEraseBtn.addEventListener("click", function () { setWhiteboardMode("draw", "erase"); });
  els.wbTextBtn.addEventListener("click", function () { setWhiteboardMode("text"); });
  els.wbClearBtn.addEventListener("click", wbClear);
  els.wbUndoBtn.addEventListener("click", wbUndo);
  els.wbRedoBtn.addEventListener("click", wbRedo);
  els.wbAddTextBtn.addEventListener("click", function () {
    wbAddTextBox();
    requestAnimationFrame(function () {
      if (state.wbActiveTextId) focusEditableTextBox(state.wbActiveTextId);
    });
  });
  els.wbDeleteTextBtn.addEventListener("click", wbDeleteActiveTextBox);
  els.wbExportBtn.addEventListener("click", wbExportPNG);

  els.wbColor.addEventListener("input", function (event) {
    state.wbColor = event.target.value;
  });

  els.wbSize.addEventListener("input", function (event) {
    state.wbSize = Number(event.target.value);
    updateWhiteboardSize();
  });

  els.wbCanvas.addEventListener("mousedown", wbPointerDown);
  els.wbCanvas.addEventListener("mousemove", wbPointerMove);
  els.wbCanvas.addEventListener("mouseup", wbPointerUp);
  els.wbCanvas.addEventListener("mouseleave", wbPointerUp);
  els.wbCanvas.addEventListener("touchstart", wbPointerDown, { passive: false });
  els.wbCanvas.addEventListener("touchmove", wbPointerMove, { passive: false });
  els.wbCanvas.addEventListener("touchend", wbPointerUp, { passive: false });

  els.wbContainer.addEventListener("mousemove", wbContainerMouseMove);
  els.wbContainer.addEventListener("mouseup", wbContainerMouseUp);
  els.wbContainer.addEventListener("mouseleave", wbContainerMouseUp);
  els.wbContainer.addEventListener("mousedown", function () {
    state.wbActiveTextId = null;
    renderWhiteboardTextBoxes();
  });
}

function bindCollageEvents() {
  els.colDrawBtn.addEventListener("click", function () { setCollageMode("draw", "draw"); });
  els.colEraseBtn.addEventListener("click", function () { setCollageMode("draw", "erase"); });
  els.colArrangeBtn.addEventListener("click", function () { setCollageMode("objects"); });
  els.colArrangeModeBtn.addEventListener("click", function () { setCollageMode("objects"); });
  els.colClearBtn.addEventListener("click", colClear);
  els.colUndoBtn.addEventListener("click", colUndo);
  els.colRedoBtn.addEventListener("click", colRedo);
  els.colDeleteImageBtn.addEventListener("click", colDeleteActiveImage);
  els.colExportBtn.addEventListener("click", colExportPNG);

  els.colColor.addEventListener("input", function (event) {
    state.colColor = event.target.value;
  });

  els.colSize.addEventListener("input", function (event) {
    state.colSize = Number(event.target.value);
    updateCollageSize();
  });

  els.colFileInput.addEventListener("change", function (event) {
    const file = event.target.files && event.target.files[0];
    if (file) colAddImageFromFile(file);
    event.target.value = "";
  });

  els.addUrlImageBtn.addEventListener("click", colAddImageFromUrl);
  els.webImageUrl.addEventListener("input", function () { showWebImageError(""); });

  els.colCanvas.addEventListener("mousedown", colPointerDown);
  els.colCanvas.addEventListener("mousemove", colPointerMove);
  els.colCanvas.addEventListener("mouseup", colPointerUp);
  els.colCanvas.addEventListener("mouseleave", colPointerUp);
  els.colCanvas.addEventListener("touchstart", colPointerDown, { passive: false });
  els.colCanvas.addEventListener("touchmove", colPointerMove, { passive: false });
  els.colCanvas.addEventListener("touchend", colPointerUp, { passive: false });

  els.colContainer.addEventListener("mousemove", colContainerMouseMove);
  els.colContainer.addEventListener("mouseup", colContainerMouseUp);
  els.colContainer.addEventListener("mouseleave", colContainerMouseUp);
  els.colContainer.addEventListener("mousedown", function () {
    state.colActiveImageId = null;
    renderCollageImages();
  });
}

function bindResizeEvents() {
  window.addEventListener("resize", function () {
    resizeWhiteboardCanvas();
    resizeCollageCanvas();
    renderWhiteboardTextBoxes();
    renderCollageImages();
  });
}

export function initWorkspace() {
  if (initialized) return;
  bindEls();
  if (!els.wbContainer || !els.colContainer) return;

  initialized = true;

  bindTabEvents();
  bindWhiteboardEvents();
  bindCollageEvents();
  bindResizeEvents();

  updateWhiteboardSize();
  updateCollageSize();
  setWhiteboardMode("draw", "draw");
  setCollageMode("draw", "draw");
  renderTab();
  renderWhiteboardTextBoxes();
  renderCollageImages();

  requestAnimationFrame(function () {
    resizeWhiteboardCanvas();
    resizeCollageCanvas();
    fillCanvasWhite(els.wbCanvas);
    fillCanvasWhite(els.colCanvas);
    wbPushHistory();
    colPushHistory();
  });
}

// Call after making the workspace view visible to re-measure canvas.
export function refreshWorkspaceCanvas() {
  if (!initialized) return;
  requestAnimationFrame(function () {
    resizeWhiteboardCanvas();
    resizeCollageCanvas();
    renderWhiteboardTextBoxes();
    renderCollageImages();
  });
}
