import jwt from "jsonwebtoken";
import { db } from "../libs/db.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized - No token provided",
            });
        }

        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({
                success: false,
                error: "Unauthorized - Invalid token",
            });
        }

        const user = await db.user.findUnique({
            where: { id: Number(decoded.id) },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Error authenticating user:", error);
        return res.status(500).json({
            success: false,
            error: "Error authenticating user",
        });
    }
};
