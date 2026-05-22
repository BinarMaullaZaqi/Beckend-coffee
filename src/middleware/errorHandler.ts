// backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";

// ─── Custom Error Interface ────────────────────────────────────────────────────
// Extends Error bawaan JS dengan tambahan field statusCode
export interface AppError extends Error {
  statusCode?: number;
  code?:       string; // untuk Prisma error code (P2002, P2025, dll)
}

// ─── Factory Function: buat error dengan statusCode ────────────────────────────
// Dipakai di semua controller: return next(createError("pesan", 404))
export const createError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  return error;
};

// ─── Prisma Error Code Mapper ──────────────────────────────────────────────────
// Mengubah kode error Prisma menjadi pesan yang ramah pengguna
const handlePrismaError = (error: AppError): { message: string; statusCode: number } => {
  switch (error.code) {
    case "P2002":
      // Unique constraint violation (misal: email duplikat)
      return {
        message:    "Data sudah ada: terdapat nilai yang harus unik namun sudah terdaftar.",
        statusCode: 409, // Conflict
      };
    case "P2025":
      // Record not found saat update/delete
      return {
        message:    "Data yang dicari tidak ditemukan di database.",
        statusCode: 404,
      };
    case "P2003":
      // Foreign key constraint failed
      return {
        message:    "Operasi gagal: data yang direferensikan tidak ditemukan.",
        statusCode: 400,
      };
    case "P2014":
      // Relasi yang diperlukan tidak ada
      return {
        message:    "Operasi gagal: relasi antar tabel tidak valid.",
        statusCode: 400,
      };
    default:
      return {
        message:    "Terjadi kesalahan pada database.",
        statusCode: 500,
      };
  }
};

// ─── Global Error Handler Middleware ──────────────────────────────────────────
// WAJIB punya 4 parameter agar Express mengenali ini sebagai error middleware
// Letakkan di paling bawah app.use() di index.ts
export const errorHandler = (
  err:   AppError,
  _req:  Request,
  res:   Response,
  _next: NextFunction
): void => {

  // Cek apakah ini error dari Prisma (punya field .code)
  if (err.code && err.code.startsWith("P")) {
    const prismaError = handlePrismaError(err);
    res.status(prismaError.statusCode).json({
      success: false,
      error:   prismaError.message,
    });
    return;
  }

  // Ambil statusCode dari error (default 500 jika tidak ada)
  const statusCode = err.statusCode || 500;
  const message    = err.message    || "Internal Server Error";

  // Log error ke console (hanya di development)
  if (process.env.NODE_ENV === "development") {
    console.error(`\n[ERROR] ${statusCode} — ${message}`);
    console.error(err.stack);
  }

  // Kirim response error ke client
  res.status(statusCode).json({
    success: false,
    error:   message,
    // Tampilkan stack trace hanya di mode development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};