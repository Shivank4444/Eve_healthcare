import crypto from "node:crypto";
import { z } from "zod";
import { db } from "../libs/db.js";

const idSchema = z.coerce.number().int().positive();

const paymentSchema = z.object({
    bookingId: idSchema,
    outcome: z.enum(["SUCCESS", "FAILED"]).optional(),
});

const webhookSchema = z.object({
    eventId: z.string().trim().min(1).max(200),
    bookingId: idSchema,
    transactionId: z.string().trim().min(1).max(200),
    status: z.enum(["SUCCESS", "FAILED"]),
});

export const createPayment = async (req, res) => {
    const parsed = paymentSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            error: "Invalid payment request",
            details: parsed.error.issues,
        });
    }

    const { bookingId, outcome } = parsed.data;

    try {
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
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
                error: "You are not authorized to pay for this booking",
            });
        }

        if (booking.status === "CANCELLED") {
            return res.status(400).json({
                success: false,
                error: "Cannot pay for a cancelled booking",
            });
        }

        if (booking.status === "CONFIRMED") {
            return res.status(409).json({
                success: false,
                error: "Booking is already confirmed and paid",
            });
        }

        const paymentStatus =
            outcome || (Math.random() >= 0.3 ? "SUCCESS" : "FAILED");

        const transactionId = `txn_${crypto.randomUUID()}`;

        const result = await db.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: {
                    bookingId: booking.id,
                    transactionId,
                    amount: booking.amount,
                    status: paymentStatus,
                },
            });

            const updatedBooking = await tx.booking.update({
                where: { id: booking.id },
                data: {
                    status:
                        paymentStatus === "SUCCESS"
                            ? "CONFIRMED"
                            : "FAILED",
                },
            });

            return {
                payment,
                booking: updatedBooking,
            };
        });

        return res.status(201).json({
            success: true,
            message:
                paymentStatus === "SUCCESS"
                    ? "Payment successful"
                    : "Payment failed",
            ...result,
        });
    } catch (error) {
        console.error("Create payment error:", error);
        return res.status(500).json({
            success: false,
            error: "Error processing payment",
        });
    }
};

export const getPaymentById = async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.id);

    if (!parsedId.success) {
        return res.status(400).json({
            success: false,
            error: "Invalid payment ID",
        });
    }

    try {
        const payment = await db.payment.findUnique({
            where: { id: parsedId.data },
            include: {
                booking: true,
            },
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: "Payment not found",
            });
        }

        if (payment.booking.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: "You are not authorized to access this payment",
            });
        }

        return res.status(200).json({
            success: true,
            payment,
        });
    } catch (error) {
        console.error("Get payment error:", error);
        return res.status(500).json({
            success: false,
            error: "Error fetching payment",
        });
    }
};

export const paymentWebhook = async (req, res) => {
    const parsed = webhookSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            error: "Invalid webhook payload",
            details: parsed.error.issues,
        });
    }

    const {
        eventId,
        bookingId,
        transactionId,
        status,
    } = parsed.data;

    try {
        const result = await db.$transaction(async (tx) => {
            const eventInsert = await tx.webhookEvent.createMany({
                data: [
                    {
                        eventId,
                        eventType: `PAYMENT_${status}`,
                        processed: true,
                    },
                ],
                skipDuplicates: true,
            });

            if (eventInsert.count === 0) {
                return {
                    duplicate: true,
                };
            }

            const booking = await tx.booking.findUnique({
                where: { id: bookingId },
            });

            if (!booking) {
                throw new Error("Booking not found");
            }

            const existingPayment = await tx.payment.findUnique({
                where: { transactionId },
            });

            if (
                existingPayment &&
                existingPayment.bookingId !== booking.id
            ) {
                throw new Error(
                    "Transaction is already associated with another booking",
                );
            }

            const payment = existingPayment
                ? await tx.payment.update({
                      where: { id: existingPayment.id },
                      data: { status },
                  })
                : await tx.payment.create({
                      data: {
                          bookingId: booking.id,
                          transactionId,
                          amount: booking.amount,
                          status,
                      },
                  });

            const updatedBooking = await tx.booking.update({
                where: { id: booking.id },
                data: {
                    status:
                        status === "SUCCESS"
                            ? "CONFIRMED"
                            : "FAILED",
                },
            });

            return {
                duplicate: false,
                payment,
                booking: updatedBooking,
            };
        });

        if (result.duplicate) {
            return res.status(200).json({
                success: true,
                message: "Webhook already processed",
                duplicate: true,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Webhook processed successfully",
            ...result,
        });
    } catch (error) {
        console.error("Payment webhook error:", error);

        if (error.message === "Booking not found") {
            return res.status(404).json({
                success: false,
                error: error.message,
            });
        }

        if (
            error.message ===
            "Transaction is already associated with another booking"
        ) {
            return res.status(409).json({
                success: false,
                error: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            error: "Error processing payment webhook",
        });
    }
};
