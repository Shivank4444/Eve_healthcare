import express from "express";
import {
    createPayment,
    getPaymentById,
    paymentWebhook,
} from "../controllers/payment.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const paymentRoutes = express.Router();

paymentRoutes.post("/", authMiddleware, createPayment);
paymentRoutes.get("/:id", authMiddleware, getPaymentById);
paymentRoutes.post("/webhook", paymentWebhook);

export default paymentRoutes;
