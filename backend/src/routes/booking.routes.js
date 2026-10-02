import express from "express";
import {
    createBooking,
    getMyBookings,
    getBookingById,
    cancelBooking,
} from "../controllers/booking.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const bookingRoutes = express.Router();

bookingRoutes.use(authMiddleware);

bookingRoutes.post("/", createBooking);
bookingRoutes.get("/", getMyBookings);
bookingRoutes.get("/:id", getBookingById);
bookingRoutes.post("/:id/cancel", cancelBooking);

export default bookingRoutes;
