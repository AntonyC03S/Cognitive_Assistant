import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const makeQrBtn = document.getElementById("makeQrBtn");
const qrDiv = document.getElementById("qr");
const statusDiv = document.getElementById("status");
const uploadLink = document.getElementById("uploadLink");
const resultImg = document.getElementById("resultImg");

let supabase = null;
let channel = null;
let currentSessionId = null;

function setStatus(text) {
  statusDiv.textContent = text || "";
}

function clearQr() {
  qrDiv.innerHTML = "";
  uploadLink.textContent = "";
  uploadLink.href = "#";
}

function setImage(url) {
  if (!url) return;
  resultImg.src = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

async function getSupabaseClient() {
  if (supabase) return supabase;

  const resp = await fetch("/api/supabase-config");
  const cfg = await resp.json();

  supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  return supabase;
}

async function subscribeToUploads(sessionId) {
  const sb = await getSupabaseClient();

  // Remove previous subscription
  if (channel) {
    await sb.removeChannel(channel);
    channel = null;
  }

  // Subscribe to INSERTs for this session
  channel = sb
    .channel(`uploads:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "uploads",
        filter: `session_id=eq.${sessionId}`
      },
      (payload) => {
        const url = payload?.new?.public_url;
        if (url) {
          setStatus("New DB row inserted. Loading image...");
          setImage(url);
          setStatus("Displayed.");
        }
      }
    )
    .subscribe();

  // Load latest existing row (if any)
  const { data, error } = await sb
    .from("uploads")
    .select("public_url, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data?.public_url) {
    setStatus("Loaded latest image from DB.");
    setImage(data.public_url);
  }
}

makeQrBtn.addEventListener("click", async () => {
  clearQr();
  resultImg.removeAttribute("src");
  setStatus("Creating session...");

  let sessionId, uploadUrl;

  try {
    const resp = await fetch("/api/session");
    const data = await resp.json();
    sessionId = data.sessionId;
    uploadUrl = data.uploadUrl;
  } catch {
    setStatus("Failed to create session.");
    return;
  }

  currentSessionId = sessionId;

  new QRCode(qrDiv, { text: uploadUrl, width: 220, height: 220 });

  uploadLink.href = uploadUrl;
  uploadLink.textContent = uploadUrl;

  setStatus("Scan the QR on your phone and upload an image.");
  await subscribeToUploads(currentSessionId);
});
