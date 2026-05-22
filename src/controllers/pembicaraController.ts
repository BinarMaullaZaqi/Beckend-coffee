// backend/src/controllers/pembicaraController.ts
import { Request, Response, NextFunction } from "express";
import prisma from "../prisma.js";
import { createError }                     from "../middleware/errorHandler.js";


// ─── TypeScript Interface untuk body request ───────────────────────────────────
interface PembicaraBody {
  nama:         string;
  spesialisasi: string;
  instansi:     string;
  email:        string;
  bio?:         string;
  foto?:        string;
}

// =============================================================================
// GET /api/pembicara
// Mengambil semua pembicara beserta jumlah event yang mereka isi
// =============================================================================
export const getAllPembicara = async (
  _req:  Request,
  res:   Response,
  next:  NextFunction
): Promise<void> => {
  try {
    const pembicara = await prisma.pembicara.findMany({
      include: {
        _count: {
          select: { events: true },
        },
      },
      orderBy: { nama: "asc" }, // Urutkan A-Z berdasarkan nama
    });

    res.status(200).json({
      success: true,
      total:   pembicara.length,
      data:    pembicara,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET /api/pembicara/:id
// Mengambil detail satu pembicara beserta daftar event yang pernah diisi
// =============================================================================
export const getPembicaraById = async (
  req:  Request<{ id: string }>,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return next(createError("ID pembicara tidak valid", 400));
    }

    const pembicara = await prisma.pembicara.findUnique({
      where:   { id },
      include: {
        events: {
          include: {
            category: {
              select: { id: true, nama: true },
            },
          },
          orderBy: { tanggal: "desc" },
        },
        _count: {
          select: { events: true },
        },
      },
    });

    if (!pembicara) {
      return next(createError(`Pembicara dengan ID ${id} tidak ditemukan`, 404));
    }

    res.status(200).json({ success: true, data: pembicara });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// POST /api/pembicara
// Body: { nama, spesialisasi, instansi, email, bio?, foto? }
// =============================================================================
export const createPembicara = async (
  req:  Request<{}, {}, PembicaraBody>,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { nama, spesialisasi, instansi, email, bio, foto } = req.body;

    // ── Validasi semua field wajib ──────────────────────────────────────────
    if (!nama || !spesialisasi || !instansi || !email) {
      return next(
        createError("Field nama, spesialisasi, instansi, dan email wajib diisi", 400)
      );
    }

    // ── Validasi format email sederhana ─────────────────────────────────────
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(createError("Format email tidak valid", 400));
    }

    // ── Cek duplikat email (lebih informatif dari error Prisma P2002) ────────
    const emailExisting = await prisma.pembicara.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (emailExisting) {
      return next(createError(`Email "${email}" sudah terdaftar untuk pembicara lain`, 409));
    }

    const pembicara = await prisma.pembicara.create({
      data: {
        nama:         nama.trim(),
        spesialisasi: spesialisasi.trim(),
        instansi:     instansi.trim(),
        email:        email.toLowerCase().trim(),
        bio:          bio?.trim()  || null,
        foto:         foto?.trim() || null,
      },
    });

    res.status(201).json({
      success: true,
      message: `Pembicara "${pembicara.nama}" berhasil ditambahkan`,
      data:    pembicara,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// PUT /api/pembicara/:id
// Body: field mana saja yang ingin diupdate (Partial<PembicaraBody>)
// =============================================================================
export const updatePembicara = async (
  req:  Request<{ id: string }, {}, Partial<PembicaraBody>>,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { nama, spesialisasi, instansi, email, bio, foto } = req.body;

    if (isNaN(id)) {
      return next(createError("ID pembicara tidak valid", 400));
    }

    // ── Cek apakah pembicara yang akan diedit ada ───────────────────────────
    const existing = await prisma.pembicara.findUnique({ where: { id } });
    if (!existing) {
      return next(createError(`Pembicara dengan ID ${id} tidak ditemukan`, 404));
    }

    // ── Jika email baru dikirim dan berbeda, cek duplikat ───────────────────
    if (email && email.toLowerCase().trim() !== existing.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(createError("Format email tidak valid", 400));
      }
      const emailDuplikat = await prisma.pembicara.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (emailDuplikat) {
        return next(createError(`Email "${email}" sudah digunakan pembicara lain`, 409));
      }
    }

    const updated = await prisma.pembicara.update({
      where: { id },
      data: {
        ...(nama         && { nama: nama.trim() }),
        ...(spesialisasi && { spesialisasi: spesialisasi.trim() }),
        ...(instansi     && { instansi: instansi.trim() }),
        ...(email        && { email: email.toLowerCase().trim() }),
        ...(bio  !== undefined && { bio:  bio?.trim()  || null }),
        ...(foto !== undefined && { foto: foto?.trim() || null }),
      },
    });

    res.status(200).json({
      success: true,
      message: `Data pembicara "${updated.nama}" berhasil diperbarui`,
      data:    updated,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// DELETE /api/pembicara/:id
// Tidak bisa dihapus jika masih terdaftar sebagai pembicara di suatu event
// =============================================================================
export const deletePembicara = async (
  req:  Request<{ id: string }>,
  res:  Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return next(createError("ID pembicara tidak valid", 400));
    }

    // ── Cek keberadaan + hitung event yang masih menggunakannya ─────────────
    const existing = await prisma.pembicara.findUnique({
      where:   { id },
      include: { _count: { select: { events: true } } },
    });

    if (!existing) {
      return next(createError(`Pembicara dengan ID ${id} tidak ditemukan`, 404));
    }

    // ── Proteksi: tolak hapus jika masih terdaftar di event ─────────────────
    if (existing._count.events > 0) {
      return next(
        createError(
          `Pembicara "${existing.nama}" tidak bisa dihapus karena masih terdaftar di ${existing._count.events} event`,
          409
        )
      );
    }

    await prisma.pembicara.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `Pembicara "${existing.nama}" berhasil dihapus`,
    });
  } catch (error) {
    next(error);
  }
};