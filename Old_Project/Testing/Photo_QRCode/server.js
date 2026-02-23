const path = require("path");
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");

const express = require("express");
const multer = require("multer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// In-memory session store:
// sessionId -> { createdAt, imageUrl, filePath }
const sessions = new Map();

// ---- File upload (Multer) ----
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const sessionId = req.params.sessionId || "unknown";
    const ext = path.extname(file.originalname || "").slice(0, 10) || ".bin";
    const safeExt = ext.match(/^\.[a-zA-Z0-9]+$/) ? ext : ".bin";
    cb(null, `${sessionId}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safeExt}`);
  }
});

function fileFilter(_req, file, cb) {
  // accept common image mime types
  if (file.mimetype && file.mimetype.startsWith("image/")) return cb(null, true);
  cb(new Error("Only image uploads are allowed."));
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ---- Static hosting ----
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOAD_DIR));

// ---- API ----
app.get("/api/session", (_req, res) => {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    createdAt: Date.now(),
    imageUrl: null,
    filePath: null
  });
  res.json({ sessionId });
});

app.get("/api/session/:sessionId", (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: "Session not found" });
  res.json({
    sessionId: req.params.sessionId,
    createdAt: s.createdAt,
    imageUrl: s.imageUrl
  });
});

app.post("/api/upload/:sessionId", upload.single("image"), (req, res) => {
  const sessionId = req.params.sessionId;
  const s = sessions.get(sessionId);
  if (!s) {
    // delete uploaded file if session doesn't exist
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    return res.status(404).json({ error: "Session not found" });
  }

  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  // If session already had an image, delete old file
  if (s.filePath && fs.existsSync(s.filePath)) {
    fs.unlink(s.filePath, () => {});
  }

  const imageUrl = `/uploads/${path.basename(req.file.path)}`;
  s.imageUrl = imageUrl;
  s.filePath = req.file.path;

  // Notify any desktop clients listening for this session
  io.to(sessionId).emit("imageUploaded", { sessionId, imageUrl });

  res.json({ ok: true, sessionId, imageUrl });
});

// ---- Socket.IO ----
io.on("connection", (socket) => {
  socket.on("joinSession", (sessionId) => {
    if (!sessions.has(sessionId)) return;
    socket.join(sessionId);

    // If an image already exists, send it immediately
    const s = sessions.get(sessionId);
    if (s?.imageUrl) {
      socket.emit("currentImage", { sessionId, imageUrl: s.imageUrl });
    }
  });
});

// ---- Cleanup old sessions ----
// This is basic cleanup. For anything public-facing, use real storage + auth.
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, s] of sessions.entries()) {
    if (now - s.createdAt > SESSION_TTL_MS) {
      if (s.filePath && fs.existsSync(s.filePath)) {
        fs.unlink(s.filePath, () => {});
      }
      sessions.delete(sessionId);
      io.to(sessionId).emit("sessionExpired", { sessionId });
    }
  }
}, 15 * 60 * 1000); // every 15 minutes

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
