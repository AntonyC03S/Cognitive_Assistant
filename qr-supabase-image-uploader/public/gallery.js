const statusEl = document.getElementById("status");
const gridEl = document.getElementById("grid");
const logoutBtn = document.getElementById("logoutBtn");

let evtSource = null;

function setStatus(t) { statusEl.textContent = t || ""; }

function formatTime(iso) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function renderItem(row, prepend = false) {
  const card = document.createElement("div");
  card.className = "tile";

  const img = document.createElement("img");
  img.src = `${row.public_url}${row.public_url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  img.alt = "upload";

  const meta = document.createElement("div");
  meta.className = "tileMeta";
  meta.textContent = formatTime(row.created_at);

  card.appendChild(img);
  card.appendChild(meta);

  if (prepend) gridEl.prepend(card);
  else gridEl.appendChild(card);
}

async function api(path, method, body) {
  const resp = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function load() {
  setStatus("Loading...");
  const data = await api("/api/my-uploads", "GET");
  gridEl.innerHTML = "";
  for (const row of data.uploads) renderItem(row);
  setStatus(`Loaded ${data.uploads.length} uploads.`);
}

logoutBtn.addEventListener("click", async () => {
  await api("/api/logout", "POST");
  if (evtSource) evtSource.close();
  window.location.href = "/";
});

(async function init() {
  try {
    await load();

    evtSource = new EventSource("/api/stream/user");
    evtSource.addEventListener("image", (evt) => {
      const row = JSON.parse(evt.data);
      renderItem({ public_url: row.publicUrl, created_at: row.createdAt }, true);
    });
  } catch (e) {
    // If not logged in, server returns 401 and this shows error
    setStatus(e.message);
    // send back to login page
    window.location.href = "/";
  }
})();
