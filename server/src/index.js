import express from "express";
import cors from "cors";
import pg from "pg";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

// Health-check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "api", time: new Date().toISOString() });
});

// Проверка соединения с БД
app.get("/api/db-check", async (_req, res) => {
  try {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const r = await client.query("SELECT NOW() AS now");
    await client.end();
    res.json({ status: "ok", db_time: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// Root
app.get("/", (_req, res) => {
  res.json({ name: "TaskFlow API", version: "0.1.0" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[api] listening on http://0.0.0.0:${PORT}`);
});
