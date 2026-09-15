const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

app.use(express.json({ limit: "20mb" }));
app.use(express.static(__dirname));

async function ensureDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL tanımlı değil.");
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS filo_state (
      id INTEGER PRIMARY KEY,
      vehicles JSONB NOT NULL DEFAULT '[]'::jsonb,
      services JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    INSERT INTO filo_state (id, vehicles, services)
    VALUES (1, '[]'::jsonb, '[]'::jsonb)
    ON CONFLICT (id) DO NOTHING
  `);
}

app.get("/health", async (_req, res) => {
  try {
    await ensureDb();
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

app.get("/api/data", async (_req, res) => {
  try {
    await ensureDb();
    const { rows } = await pool.query(
      "SELECT vehicles, services, updated_at FROM filo_state WHERE id=1"
    );
    const row = rows[0];
    res.json({
      vehicles: row?.vehicles || [],
      services: row?.services || [],
      updatedAt: row?.updated_at || null
    });
  } catch (err) {
    console.error("GET /api/data:", err);
    res.status(500).json({ error: "Veriler alınamadı." });
  }
});

app.post("/api/data", async (req, res) => {
  try {
    await ensureDb();

    const vehicles = Array.isArray(req.body?.vehicles) ? req.body.vehicles : [];
    const services = Array.isArray(req.body?.services) ? req.body.services : [];

    await pool.query(
      `UPDATE filo_state
       SET vehicles=$1::jsonb, services=$2::jsonb, updated_at=NOW()
       WHERE id=1`,
      [JSON.stringify(vehicles), JSON.stringify(services)]
    );

    res.json({ ok: true, vehicleCount: vehicles.length, serviceCount: services.length });
  } catch (err) {
    console.error("POST /api/data:", err);
    res.status(500).json({ error: "Veriler kaydedilemedi." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

async function start() {
  try {
    await ensureDb();
    console.log("PostgreSQL bağlantısı hazır.");
  } catch (err) {
    console.error("PostgreSQL başlangıç hatası:", err.message);
    // Site yine açılır; istemci yerel kayıtlarla çalışabilir.
  }

  app.listen(PORT, () => {
    console.log(`112 Filo site listening on port ${PORT}`);
  });
}

start();
