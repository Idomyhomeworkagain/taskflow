import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import prisma from "./db.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";

const app = express();

// --- Middleware ---
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true, // обязательно для cookie
  })
);
app.use(express.json());
app.use(cookieParser());

// --- Health ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "api", time: new Date().toISOString() });
});

app.get("/api/db-check", async (_req, res) => {
  try {
    const [userCount, projectCount, taskCount] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.task.count(),
    ]);
    res.json({
      status: "ok",
      counts: { users: userCount, projects: projectCount, tasks: taskCount },
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

app.get("/api/seed-status", async (_req, res) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@taskflow.local" },
      select: { id: true, email: true, role: true },
    });
    const client = await prisma.user.findUnique({
      where: { email: "client@taskflow.local" },
      select: { id: true, email: true, role: true },
    });
    res.json({ seeded: Boolean(admin && client), admin, client });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// --- Root ---
app.get("/", (_req, res) => {
  res.json({ name: "TaskFlow API", version: "0.3.0" });
});

// --- 404 ---
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// --- Error handler ---
app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[api] listening on http://0.0.0.0:${PORT}`);
});