// backend/src/controllers/categoryController.ts
import { Request, Response, NextFunction } from "express";
import prisma from "../prisma.js";
import { createError }                     from "../middleware/errorHandler.js";


// ─── TypeScript Interface untuk body request ───────────────────────────────────
interface CategoryBody {
  nama:      string;
  deskripsi?: string;
}

// =============================================================================
// GET /api/categories
// Mengambil semua kategori beserta jumlah event di tiap kategori
// =============================================================================
export const getAllCategories = async (
  _req:  Request,
  res:   Response,
  next:  NextFunction
): Promise<void> => {
  try {
    const categories = await prisma.categoryEvent.findMany({
      include: {
        // _count dipakai untuk hitung jumlah event tanpa fetch datanya
        _count: {
          select: { events: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      total:   categories.length,
      data:    categories,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET /api/categories/:id
// Mengambil satu kategori beserta daftar event-nya
// =============================================================================
export const getCategoryById = async (
  req:  Request<{ id: string }>,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return next(createError("ID kategori tidak valid", 400));
    }

    const category = await prisma.categoryEvent.findUnique({
      where:   { id },
      include: {
        events: {
          include: {
            pembicara: {
              select: { id: true, nama: true, spesialisasi: true },
            },
          },
          orderBy: { tanggal: "asc" },
        },
        _count: {
          select: { events: true },
        },
      },
    });

    if (!category) {
      return next(createError(`Kategori dengan ID ${id} tidak ditemukan`, 404));
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// POST /api/categories
// Body: { nama: string, deskripsi?: string }
// =============================================================================
export const createCategory = async (
  req:  Request<{}, {}, CategoryBody>,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { nama, deskripsi } = req.body;

    // ── Validasi field wajib ────────────────────────────────────────────────
    if (!nama || nama.trim() === "") {
      return next(createError("Field 'nama' kategori wajib diisi", 400));
    }

    // ── Cek duplikat nama sebelum insert (lebih informatif dari P2002) ──────
    const existing = await prisma.categoryEvent.findUnique({
      where: { nama: nama.trim() },
    });
    if (existing) {
      return next(createError(`Kategori dengan nama "${nama}" sudah ada`, 409));
    }

    const category = await prisma.categoryEvent.create({
      data: {
        nama:      nama.trim(),
        deskripsi: deskripsi?.trim() || null,
      },
    });

    res.status(201).json({
      success: true,
      message: `Kategori "${category.nama}" berhasil dibuat`,
      data:    category,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// PUT /api/categories/:id
// Body: { nama?: string, deskripsi?: string }
// =============================================================================
export const updateCategory = async (
  req:  Request<{ id: string }, {}, Partial<CategoryBody>>,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id              = parseInt(req.params.id);
    const { nama, deskripsi } = req.body;

    if (isNaN(id)) {
      return next(createError("ID kategori tidak valid", 400));
    }

    // ── Cek apakah kategori yang akan diedit ada ────────────────────────────
    const existing = await prisma.categoryEvent.findUnique({ where: { id } });
    if (!existing) {
      return next(createError(`Kategori dengan ID ${id} tidak ditemukan`, 404));
    }

    // ── Jika nama baru dikirim, cek agar tidak duplikat dengan kategori lain ─
    if (nama && nama.trim() !== existing.nama) {
      const namaDuplikat = await prisma.categoryEvent.findUnique({
        where: { nama: nama.trim() },
      });
      if (namaDuplikat) {
        return next(createError(`Nama kategori "${nama}" sudah digunakan`, 409));
      }
    }

    const updated = await prisma.categoryEvent.update({
      where: { id },
      data: {
        // Hanya update field yang dikirim
        ...(nama      && { nama: nama.trim() }),
        ...(deskripsi !== undefined && { deskripsi: deskripsi.trim() || null }),
      },
    });

    res.status(200).json({
      success: true,
      message: `Kategori berhasil diperbarui`,
      data:    updated,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// DELETE /api/categories/:id
// Tidak bisa dihapus jika masih ada event yang menggunakan kategori ini
// =============================================================================
export const deleteCategory = async (
  req:  Request<{ id: string }>,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return next(createError("ID kategori tidak valid", 400));
    }

    // ── Cek apakah kategori ada, sekaligus hitung event yang memakai ─────────
    const existing = await prisma.categoryEvent.findUnique({
      where:   { id },
      include: { _count: { select: { events: true } } },
    });

    if (!existing) {
      return next(createError(`Kategori dengan ID ${id} tidak ditemukan`, 404));
    }

    // ── Proteksi: tolak hapus jika masih dipakai event ───────────────────────
    if (existing._count.events > 0) {
      return next(
        createError(
          `Kategori "${existing.nama}" tidak bisa dihapus karena masih digunakan oleh ${existing._count.events} event`,
          409
        )
      );
    }

    await prisma.categoryEvent.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `Kategori "${existing.nama}" berhasil dihapus`,
    });
  } catch (error) {
    next(error);
  }
};