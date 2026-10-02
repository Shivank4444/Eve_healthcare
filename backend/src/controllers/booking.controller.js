import { z } from "zod";
import { db } from "../libs/db.js";

const idSchema = z.coerce.number().int().positive();

const bookingSchema = z.object({
    centreTestId: idSchema,
    appointmentAt: z.coerce.date(),
});

export const createBooking = async (req, res) => {
    const parsed = bookingSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            error: "Invalid booking data",
            details: parsed.error.issues,
        });
    }

    const { centreTestId, appointmentAt } = parsed.data;

    if (appointmentAt <= new Date()) {
        return res.status(400).json({
            success: false,
            error: "Appointment date/time must be in the future",
        });
    }

    try {
        const centreTest = await db.centreTest.findUnique({
            where: { id: centreTestId },
            include: {
                centre: true,
                test: true,
            },
        });

        if (!centreTest) {
            return res.status(404).json({
                success: false,
                error: "Diagnostic test is not available at this centre",
            });
        }

        const booking = await db.booking.create({
            data: {
                userId: req.user.id,
                centreTestId,
                appointmentAt,
                amount: centreTest.price,
                status: "PENDING",
            },
            include: {
                centreTest: {
                    include: {
                        centre: true,
                        test: true,
                    },
                },
            },
        });

        return res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking,
        });
    } catch (error) {
        console.error("Create booking error:", error);
        return res.status(500).json({
            success: false,
            error: "Error creating booking",
        });
    }
};

export const getMyBookings = async (req, res) => {
    try {
        const bookings = await db.booking.findMany({
            where: { userId: req.user.id },
            include: {
                centreTest: {
                    include: {
                        centre: true,
                        test: true,
                    },
                },
                payments: {
                    orderBy: { createdAt: "desc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({
            success: true,
            bookings,
        });
    } catch (error) {
        console.error("Get bookings error:", error);
        return res.status(500).json({
            success: false,
            error: "Error fetching bookings",
        });
    }
};

export const getBookingById = async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.id);

    if (!parsedId.success) {
        return res.status(400).json({
            success: false,
            error: "Invalid booking ID",
        });
    }

    try {
        const booking = await db.booking.findUnique({
            where: { id: parsedId.data },
            include: {
                centreTest: {
                    include: {
                        centre: true,
                        test: true,
                    },
                },
                payments: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: "Booking not found",
            });
        }

        if (booking.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: "You are not authorized to access this booking",
            });
        }

        return res.status(200).json({
            success: true,
            booking,
        });
    } catch (error) {
        console.error("Get booking error:", error);
        return res.status(500).json({
            success: false,
            error: "Error fetching booking",
        });
    }
};

export const cancelBooking = async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.id);

    if (!parsedId.success) {
        return res.status(400).json({
            success: false,
            error: "Invalid booking ID",
        });
    }

    try {
        const booking = await db.booking.findUnique({
            where: { id: parsedId.data },
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: "Booking not found",
            });
        }

        if (booking.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: "You are not authorized to cancel this booking",
            });
        }

        if (booking.status === "CANCELLED") {
            return res.status(400).json({
                success: false,
                error: "Booking is already cancelled",
            });
        }

        if (booking.status === "FAILED") {
            return res.status(400).json({
                success: false,
                error: "Failed booking does not need cancellation",
            });
        }

        const updatedBooking = await db.booking.update({
            where: { id: parsedId.data },
            data: { status: "CANCELLED" },
        });

        return res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            booking: updatedBooking,
        });
    } catch (error) {
        console.error("Cancel booking error:", error);
        return res.status(500).json({
            success: false,
            error: "Error cancelling booking",
        });
    }
};
