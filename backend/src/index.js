import express from "express";
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import centreRoutes from "./routes/centre.routes.js";
import testRoutes from "./routes/test.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";

dotenv.config();

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        credentials: true,
    }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "EVE Healthcare API is running",
    });
});

app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is healthy",
    });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/centres", centreRoutes);
app.use("/api/v1/tests", testRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/payments", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

