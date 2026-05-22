import "dotenv/config";
import express, { Application, Request, Response } from "express";
import cors from "cors";

import prisma from "./prisma.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import pembicaraRoutes from "./routes/pembicaraRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app: Application = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware Global ─────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "☕ Coffee Event Management API — aktif!",
    version: "1.0.0",
    endpoints: {
      categories: "/api/categories",
      pembicara: "/api/pembicara",
      events: "/api/events",
    },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/categories", categoryRoutes);
app.use("/api/pembicara", pembicaraRoutes);
app.use("/api/events", eventRoutes);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Jalankan Server ──────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  // Test koneksi DB saat startup
  try {
    await prisma.$connect();
    console.log("✅  Database terhubung");
  } catch (e) {
    console.error("❌  Gagal konek DB:", e);
  }
  console.log(`☕  Server berjalan di → http://localhost:${PORT}`);
  console.log(`📋  Mode: ${process.env.NODE_ENV || "development"}`);
});

export default app;
