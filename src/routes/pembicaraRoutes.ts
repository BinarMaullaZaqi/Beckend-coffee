// backend/src/routes/pembicaraRoutes.ts
import { Router } from "express";
import {
  getAllPembicara,
  getPembicaraById,
  createPembicara,
  updatePembicara,
  deletePembicara,
} from "../controllers/pembicaraController.js";

const router = Router();

// ─── Tabel Endpoint Pembicara (5 aksi) ────────────────────────────────────────
// METHOD   PATH                    CONTROLLER         AKSI
// GET      /api/pembicara          getAllPembicara     → ambil semua pembicara
// GET      /api/pembicara/:id      getPembicaraById   → ambil satu pembicara
// POST     /api/pembicara          createPembicara    → tambah pembicara baru
// PUT      /api/pembicara/:id      updatePembicara    → update pembicara
// DELETE   /api/pembicara/:id      deletePembicara    → hapus pembicara

router.get(    "/",    getAllPembicara);
router.get(    "/:id", getPembicaraById);
router.post(   "/",    createPembicara);
router.put(    "/:id", updatePembicara);
router.delete( "/:id", deletePembicara);

export default router;