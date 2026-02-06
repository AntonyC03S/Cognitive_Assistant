import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", true);

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY; // safe to send to browser
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // SERVER ONLY
const BUCKET = process.env.SUPABASE_BUCKET || "uploads";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars. Check .env (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}

// Admin client (uses secret/service_role; bypasses RLS; keep it private)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Browser needs URL + anon key (safe to expose with RLS)
app.get("/api/supabase-config", (_req, res) => {
  res.json({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY });
});

function getPublicBaseUrl(req) {
  // Optional override for QR links if you deploy behind a domain/tunnel
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/+$/, "");

  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

// Create a session row in DB and return a phone upload URL for the QR code
app.get("/api/session", async (req, res) => {
  const sessionId = crypto.randomUUID();

  const { error } = await supabaseAdmin.from("sessions").insert({ id: sessionId });
  if (error) return res.status(500).json({ error: error.message });

  const uploadUrl = `${getPublicBaseUrl(req)}/upload.html?session=${encodeURIComponent(sessionId)}`;
  res.json({ sessionId, uploadUrl });
});

// Multer: keep file in memory, then push to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Only image uploads are allowed."));
  }
});

function safeExtFromMime(mime) {
  switch (mime) {
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "image/webp": return ".webp";
    case "image/gif": return ".gif";
    case "image/heic": return ".heic";
    case "image/heif": return ".heif";
    default: return "";
  }
}

app.post("/api/upload/:sessionId", upload.single("image"), async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Confirm session exists
    const { data: s, error: sErr } = await supabaseAdmin
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sErr) return res.status(500).json({ error: sErr.message });
    if (!s) return res.status(404).json({ error: "Session not found" });

    const ext =
      safeExtFromMime(req.file.mimetype) ||
      (path.extname(req.file.originalname || "").match(/^\.[a-zA-Z0-9]+$/)
        ? path.extname(req.file.originalname)
        : "");

    const objectPath = `${sessionId}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;

    // Upload image bytes to Storage
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(objectPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (upErr) return res.status(500).json({ error: upErr.message });

    // Get public URL (bucket must be public)
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath);
    const publicUrl = urlData.publicUrl;

    // Insert metadata into DB (desktop listens to this table)
    const { error: dbErr } = await supabaseAdmin.from("uploads").insert({
      session_id: sessionId,
      object_path: objectPath,
      public_url: publicUrl,
      mime_type: req.file.mimetype
    });

    if (dbErr) return res.status(500).json({ error: dbErr.message });

    res.json({ ok: true, sessionId, publicUrl });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Upload failed" });
  }
});

// Multer errors -> JSON
app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err?.message || "Bad request" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
