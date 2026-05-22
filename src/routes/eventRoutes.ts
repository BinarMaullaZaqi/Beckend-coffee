// backend/src/routes/eventRoutes.ts
import { Router } from "express";
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController";

const router = Router();

// ─── Tabel Endpoint Event (5 aksi) ────────────────────────────────────────────
// METHOD   PATH                    CONTROLLER         AKSI
// GET      /api/events             getAllEvents        → ambil semua event
//                                                       (opsional: ?status=UPCOMING
//                                                                  &categoryId=1)
// GET      /api/events/:id         getEventById       → ambil satu event
// POST     /api/events             createEvent        → buat event baru
// PUT      /api/events/:id         updateEvent        → update event
// DELETE   /api/events/:id         deleteEvent        → hapus event

router.get(    "/",    getAllEvents);
router.get(    "/:id", getEventById);
router.post(   "/",    createEvent);
router.put(    "/:id", updateEvent);
router.delete( "/:id", deleteEvent);

export default router;