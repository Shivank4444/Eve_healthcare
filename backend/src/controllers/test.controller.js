import { z } from "zod";
import { db } from "../libs/db.js";

const idSchema = z.coerce.number().int().positive();

const testSchema = z.object({
    name: z.string().trim().min(2).max(150),
    description: z.string().trim().max(1000).optional().nullable(),
});

export const createTest = async (req, res) => {
    const parsed = testSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            error: "Invalid diagnostic test data",
            details: parsed.error.issues,
        });
    }

    try {
        const existingTest = await db.diagnosticTest.findFirst({
            where: {
                name: {
                    equals: parsed.data.name,
                    mode: "insensitive",
                },
            },
        });

        if (existingTest) {
            return res.status(409).json({
                success: false,
                error: "Diagnostic test already exists",
            });
        }

        const test = await db.diagnosticTest.create({
            data: parsed.data,
        });

        return res.status(201).json({
            success: true,
            message: "Diagnostic test created successfully",
            test,
        });
    } catch (error) {
        console.error("Create test error:", error);
        return res.status(500).json({
            success: false,
            error: "Error creating diagnostic test",
        });
    }
};

export const getAllTests = async (req, res) => {
    try {
        const tests = await db.diagnosticTest.findMany({
            include: {
                centreTests: {
                    include: {
                        centre: true,
                    },
                },
            },
            orderBy: { id: "asc" },
        });

        return res.status(200).json({
            success: true,
            tests,
        });
    } catch (error) {
        console.error("Get tests error:", error);
        return res.status(500).json({
            success: false,
            error: "Error fetching diagnostic tests",
        });
    }
};

export const getTestById = async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.id);

    if (!parsedId.success) {
        return res.status(400).json({
            success: false,
            error: "Invalid test ID",
        });
    }

    try {
        const test = await db.diagnosticTest.findUnique({
            where: { id: parsedId.data },
            include: {
                centreTests: {
                    include: { centre: true },
                },
            },
        });

        if (!test) {
            return res.status(404).json({
                success: false,
                error: "Diagnostic test not found",
            });
        }

        return res.status(200).json({
            success: true,
            test,
        });
    } catch (error) {
        console.error("Get test error:", error);
        return res.status(500).json({
            success: false,
            error: "Error fetching diagnostic test",
        });
    }
};

export const updateTest = async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.id);
    const parsedBody = testSchema.partial().safeParse(req.body);

    if (
        !parsedId.success ||
        !parsedBody.success ||
        Object.keys(parsedBody.data).length === 0
    ) {
        return res.status(400).json({
            success: false,
            error: "Valid test ID and at least one field are required",
        });
    }

    try {
        const test = await db.diagnosticTest.findUnique({
            where: { id: parsedId.data },
        });

        if (!test) {
            return res.status(404).json({
                success: false,
                error: "Diagnostic test not found",
            });
        }

        const updatedTest = await db.diagnosticTest.update({
            where: { id: parsedId.data },
            data: parsedBody.data,
        });

        return res.status(200).json({
            success: true,
            message: "Diagnostic test updated successfully",
            test: updatedTest,
        });
    } catch (error) {
        console.error("Update test error:", error);
        return res.status(500).json({
            success: false,
            error: "Error updating diagnostic test",
        });
    }
};

export const deleteTest = async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.id);

    if (!parsedId.success) {
        return res.status(400).json({
            success: false,
            error: "Invalid test ID",
        });
    }

    try {
        const test = await db.diagnosticTest.findUnique({
            where: { id: parsedId.data },
        });

        if (!test) {
            return res.status(404).json({
                success: false,
                error: "Diagnostic test not found",
            });
        }

        const linkedTests = await db.centreTest.count({
            where: { testId: parsedId.data },
        });

        if (linkedTests > 0) {
            return res.status(409).json({
                success: false,
                error: "Cannot delete a test while it is linked to a centre",
            });
        }

        await db.diagnosticTest.delete({
            where: { id: parsedId.data },
        });

        return res.status(200).json({
            success: true,
            message: "Diagnostic test deleted successfully",
        });
    } catch (error) {
        console.error("Delete test error:", error);
        return res.status(500).json({
            success: false,
            error: "Error deleting diagnostic test",
        });
    }
};
