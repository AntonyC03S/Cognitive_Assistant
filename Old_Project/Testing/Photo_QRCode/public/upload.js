const params = new URLSearchParams(window.location.search);
const sessionId = params.get("session");

const statusDiv = document.getElementById("uploadStatus");
const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const previewImg = document.getElementById("previewImg");

function setStatus(text) {
  statusDiv.textContent = text || "";
}

if (!sessionId) {
  setStatus("Missing session id. Re-scan the QR code.");
  form.style.display = "none";
} else {
  setStatus("Choose an image and upload.");
}

fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (!f) return;
  previewImg.src = URL.createObjectURL(f);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!sessionId) return;

  const file = fileInput.files?.[0];
  if (!file) {
    setStatus("Pick a file first.");
    return;
  }

  setStatus("Uploading...");

  const fd = new FormData();
  fd.append("image", file);

  try {
    const resp = await fetch(`/api/upload/${encodeURIComponent(sessionId)}`, {
      method: "POST",
      body: fd
    });
    const data = await resp.json();

    if (!resp.ok) {
      setStatus(data?.error || "Upload failed.");
      return;
    }

    setStatus("Upload complete. The image should now appear on the other screen.");
  } catch (err) {
    setStatus("Upload failed (network/server error).");
  }
});
