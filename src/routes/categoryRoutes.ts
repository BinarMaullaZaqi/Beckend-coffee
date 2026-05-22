// backend/src/routes/categoryRoutes.ts
import { Router } from "express";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = Router();

// ─── Tabel Endpoint Kategori (5 aksi) ─────────────────────────────────────────
// METHOD   PATH                    CONTROLLER         AKSI
// GET      /api/categories         getAllCategories    → ambil semua kategori
// GET      /api/categories/:id     getCategoryById    → ambil satu kategori
// POST     /api/categories         createCategory     → buat kategori baru
// PUT      /api/categories/:id     updateCategory     → update kategori
// DELETE   /api/categories/:id     deleteCategory     → hapus kategori

router.get(    "/",    getAllCategories);
router.get(    "/:id", getCategoryById);
router.post(   "/",    createCategory);
router.put(    "/:id", updateCategory);
router.delete( "/:id", deleteCategory);

export default router;