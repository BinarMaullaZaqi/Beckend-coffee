// backend/src/controllers/eventController.ts
import { Request, Response, NextFunction } from "express";
import prisma from "../prisma.js";
import { createError }                      from "../middleware/errorHandler.js";

// ─── 1. IMPORT TIPE ENUM EVENTSTATUS DARI @PRISMA/CLIENT BIAR GA MERAH BRAY! ───
import { EventStatus } from "@prisma/client";

// ─── TypeScript Interface untuk body request ───────────────────────────────────
interface EventBody {
  judul:       string;
  deskripsi:   string;
  tanggal:     string;      // ISO string, dikonversi ke Date saat simpan
  lokasi:      string;
  harga:       number;
  kapasitas:   number;
  imageUrl?:   string;
  status?:     EventStatus;
  categoryId:  number;
  pembicaraId: number;
}

// ─── Query params untuk filter ─────────────────────────────────────────────────
interface EventQuery {
  status?:     string;
  categoryId?: string;
}

// =============================================================================
// GET /api/events
// GET /api/events?status=UPCOMING
// GET /api/events?categoryId=1
// =============================================================================
export const getAllEvents = async (
  req: Request<{}, {}, {}, EventQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, categoryId } = req.query;

    const events = await prisma.event.findMany({
      where: {
        // Filter opsional berdasarkan query params
        ...(status     && { status: status as EventStatus }),
        ...(categoryId && { categoryId: parseInt(categoryId) }),
      },
      include: {
        category:  true,  // JOIN ke tabel CategoryEvent
        pembicara: {      // JOIN ke tabel Pembicara (pilih field tertentu saja)
          select: {
            id:           true,
            nama:         true,
            spesialisasi: true,
            instansi:     true,
            foto:         true,
          },
        },
      },
      orderBy: { tanggal: "asc" }, // Urutkan dari yang paling dekat
    });

    res.status(200).json({
      success: true,
      total:   events.length,
      data:    events,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET /api/events/:id
// =============================================================================
export const getEventById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    // Validasi: pastikan id adalah angka valid
    if (isNaN(id)) {
      return next(createError("ID event tidak valid", 400));
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        category:  true,
        pembicara: true,  // Ambil semua field pembicara untuk detail page
      },
    });

    if (!event) {
      return next(createError(`Event dengan ID ${id} tidak ditemukan`, 404));
    }

    res.status(200).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// POST /api/events
// Body: { judul, deskripsi, tanggal, lokasi, harga, kapasitas,
//         imageUrl, status, categoryId, pembicaraId }
// =============================================================================
export const createEvent = async (
  req: Request<{}, {}, EventBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      judul, deskripsi, tanggal, lokasi,
      harga, kapasitas, imageUrl, status,
      categoryId, pembicaraId,
    } = req.body;

    // ── Validasi field wajib ────────────────────────────────────────────────
    if (!judul || !deskripsi || !tanggal || !lokasi) {
      return next(createError("Field judul, deskripsi, tanggal, dan lokasi wajib diisi", 400));
    }
    if (!categoryId || !pembicaraId) {
      return next(createError("categoryId dan pembicaraId wajib diisi", 400));
    }

    // ── Validasi Foreign Key: pastikan kategori dan pembicara ada di DB ──────
    const [category, pembicara] = await Promise.all([
      prisma.categoryEvent.findUnique({ where: { id: Number(categoryId) } }),
      prisma.pembicara.findUnique({     where: { id: Number(pembicaraId) } }),
    ]);

    if (!category) {
      return next(createError(`Kategori dengan ID ${categoryId} tidak ditemukan`, 404));
    }
    if (!pembicara) {
      return next(createError(`Pembicara dengan ID ${pembicaraId} tidak ditemukan`, 404));
    }

    // ── Simpan ke database ──────────────────────────────────────────────────
    const newEvent = await prisma.event.create({
      data: {
        judul,
        deskripsi,
        tanggal:     new Date(tanggal),       // konversi string → Date
        lokasi,
        harga:       Number(harga)    || 0,
        kapasitas:   Number(kapasitas) || 50,
        imageUrl:    imageUrl || null,
        status:      status  || "UPCOMING",
        categoryId:  Number(categoryId),
        pembicaraId: Number(pembicaraId),
      },
      include: {
        category:  true,
        pembicara: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Event berhasil dibuat",
      data:    newEvent,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// PUT /api/events/:id
// Body: field mana saja yang ingin diupdate (Partial<EventBody>)
// =============================================================================
export const updateEvent = async (
  req: Request<{ id: string }, {}, Partial<EventBody>>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id   = parseInt(req.params.id);
    const body = req.body;

    if (isNaN(id)) {
      return next(createError("ID event tidak valid", 400));
    }

    // ── Cek apakah event ada ────────────────────────────────────────────────
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return next(createError(`Event dengan ID ${id} tidak ditemukan`, 404));
    }

    // ── Jika categoryId dikirim, validasi dulu ──────────────────────────────
    if (body.categoryId) {
      const cat = await prisma.categoryEvent.findUnique({
        where: { id: Number(body.categoryId) },
      });
      if (!cat) {
        return next(createError(`Kategori dengan ID ${body.categoryId} tidak ditemukan`, 404));
      }
    }

    // ── Jika pembicaraId dikirim, validasi dulu ─────────────────────────────
    if (body.pembicaraId) {
      const pem = await prisma.pembicara.findUnique({
        where: { id: Number(body.pembicaraId) },
      });
      if (!pem) {
        return next(createError(`Pembicara dengan ID ${body.pembicaraId} tidak ditemukan`, 404));
      }
    }

    // ── Update hanya field yang dikirim (partial update) ────────────────────
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(body.judul       && { judul: body.judul }),
        ...(body.deskripsi   && { deskripsi: body.deskripsi }),
        ...(body.tanggal     && { tanggal: new Date(body.tanggal) }),
        ...(body.lokasi      && { lokasi: body.lokasi }),
        ...(body.harga       !== undefined && { harga: Number(body.harga) }),
        ...(body.kapasitas   !== undefined && { kapasitas: Number(body.kapasitas) }),
        ...(body.imageUrl    !== undefined && { imageUrl: body.imageUrl }),
        ...(body.status      && { status: body.status }),
        ...(body.categoryId  && { categoryId: Number(body.categoryId) }),
        ...(body.pembicaraId && { pembicaraId: Number(body.pembicaraId) }),
      },
      include: {
        category:  true,
        pembicara: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Event berhasil diperbarui",
      data:    updatedEvent,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// DELETE /api/events/:id
// =============================================================================
export const deleteEvent = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return next(createError("ID event tidak valid", 400));
    }

    // ── Cek apakah event ada sebelum dihapus ────────────────────────────────
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return next(createError(`Event dengan ID ${id} tidak ditemukan`, 404));
    }

    await prisma.event.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `Event "${existing.judul}" berhasil dihapus`,
    });
  } catch (error) {
    next(error);
  }
};