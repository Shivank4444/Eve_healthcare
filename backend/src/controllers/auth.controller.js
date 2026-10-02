import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../libs/db.js";

const authSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(255),
    password: z.string().min(6).max(100),
});

const loginSchema = z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(1).max(100),
});

const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const createToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
    );
};

export const register = async (req, res) => {
    try {
        const parsed = authSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: "Invalid request",
                details: parsed.error.issues,
            });
        }

        const { name, email, password } = parsed.data;

        const existingUser = await db.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await db.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });

        const token = createToken(user.id);

        res.cookie("jwt", token, cookieOptions);

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user,
        });
    } catch (error) {
        console.error("Error creating user:", error);
        return res.status(500).json({
            success: false,
            error: "Error creating user",
        });
    }
};

export const login = async (req, res) => {
    try {
        const parsed = loginSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: "Invalid request",
                details: parsed.error.issues,
            });
        }

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials",
            });
        }

        const passwordMatched = await bcrypt.compare(
            password,
            user.password,
        );

        if (!passwordMatched) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials",
            });
        }

        const token = createToken(user.id);
        res.cookie("jwt", token, cookieOptions);

        return res.status(200).json({
            success: true,
            message: "User logged in successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("Error logging in user:", error);
        return res.status(500).json({
            success: false,
            error: "Error logging in user",
        });
    }
};

export const logout = async (req, res) => {
    res.clearCookie("jwt", cookieOptions);

    return res.status(200).json({
        success: true,
        message: "User logged out successfully",
    });
};

export const check = async (req, res) => {
    return res.status(200).json({
        success: true,
        message: "User authenticated successfully",
        user: req.user,
    });
};
