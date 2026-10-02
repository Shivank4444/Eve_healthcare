import { z } from "zod";
import { db } from "../libs/db.js";

const idSchema = z.coerce.number().int().positive();

const centreSchema = z.object({
    name: z.string().trim().min(2).max(150),
    location: z.string().trim().min(2).max(255),
});

const centreTestSchema = z.object({
    testId: idSchema,
    price: z.coerce.number().positive().max(1000000),
});

export const createCentre = async (req, res) => {
    try {
        const parsed = centreSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                error: "Invalid centre data",
                details: parsed.error.issues,
            });
        }

        const centre = await db.diagnosticCentre.create({
            data: parsed.data,
        });

        return res.status(201).json({
            success: true,
            message: "Diagnostic centre created successfully",
            centre,
        });
    } catch (error) {
        console.error("Create centre error:", error);
        return res.status(500).json({
            success: false,
            error: "Error creating diagnostic centre",
        });
    }
};

export const getAllCentres = async (req, res) => {
    try {
        const centres = await db.diagnosticCentre.findMany({
            include: {
                centreTests: {
                    include: {
                        test: true,
                    },
                    orderBy: { id: "asc" },
                },
            },
            orderBy: { id: "asc" },
        });

        return res.status(200).json({
            success: true,
            centres,
        });
    } catch (error) {
        console.error("Get centres error:", error);
        return res.status(500).json({
            success: false,
            error: "Error fetching diagnostic centres",
        });
    }
};

export const getCentreById = async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.id);

    if (!parsedId.success) {
        return res.status(400).json({
            success: false,
            error: "Invalid centre ID",
        });
    }

    try {
        const centre = await db.diagnosticCentre.findUnique({
            where: { id: parsedId.data },
            include: {
                centreTests: {
                    include: { test: true },
                },
            },
        });

        if (!centre) {
            return res.status(404).json({
                success: false,
                error: "Diagnostic centre not found",
            });
        }

        return res.status(200).json({
            success: true,
            centre,
        });
    } catch (error) {
        console.error("Get centre error:", error);
        return res.status(500).json({
            success: false,
            error: "Error fetching diagnostic centre",
        });
    }
};

export const updateCentre = async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.id);
    const parsedBody = centreSchema.partial().safeParse(req.body);

    if (!parsedId.success || !parsedBody.success || Object.keys(parsedBody.data).length === 0) {
        return res.status(400).json({
            success: false,
            error: "Valid centre ID and at least one field are required",
        });
    }

    try {
        const centre = await db.diagnosticCentre.findUnique({
            where: { id: parsedId.data },
        });

        if (!centre) {
            return res.status(404).json({
                success: false,
                error: "Diagnostic centre not found",
            });
        }

        const updatedCentre = await db.diagnosticCentre.update({
            where: { id: parsedId.data },
            data: parsedBody.data,
        });

        return res.status(200).json({
            success: true,
            message: "Diagnostic centre updated successfully",
            centre: updatedCentre,
        });
    } catch (error) {
        console.error("Update centre error:", error);
        return res.status(500).json({
            success: false,
            error: "Error updating diagnostic centre",
        });
    }
};

export const deleteCentre = async (req, res) => {
    const parsedId = idSchema.safeParse(req.params.id);

    if (!parsedId.success) {
        return res.status(400).json({
            success: false,
            error: "Invalid centre ID",
        });
    }

    try {
        const centre = await db.diagnosticCentre.findUnique({
            where: { id: parsedId.data },
        });

        if (!centre) {
            return res.status(404).json({
                success: false,
                error: "Diagnostic centre not found",
            });
        }

        const linkedTests = await db.centreTest.count({
            where: { centreId: parsedId.data },
        });

        if (linkedTests > 0) {
            return res.status(409).json({
                success: false,
                error: "Cannot delete a centre while tests are linked to it",
            });
        }

        await db.diagnosticCentre.delete({
            where: { id: parsedId.data },
        });

        return res.status(200).json({
            success: true,
            message: "Diagnostic centre deleted successfully",
        });
    } catch (error) {
        console.error("Delete centre error:", error);
        return res.status(500).json({
            success: false,
            error: "Error deleting diagnostic centre",
        });
    }
};

export const addTestToCentre = async (req, res) => {
    const centreId = idSchema.safeParse(req.params.centreId);
    const parsedBody = centreTestSchema.safeParse(req.body);

    if (!centreId.success || !parsedBody.success) {
        return res.status(400).json({
            success: false,
            error: "Valid centreId, testId and price are required",
        });
    }

    try {
        const centre = await db.diagnosticCentre.findUnique({
            where: { id: centreId.data },
        });

        if (!centre) {
            return res.status(404).json({
                success: false,
                error: "Diagnostic centre not found",
            });
        }

        const test = await db.diagnosticTest.findUnique({
            where: { id: parsedBody.data.testId },
        });

        if (!test) {
            return res.status(404).json({
                success: false,
                error: "Diagnostic test not found",
            });
        }

        const existing = await db.centreTest.findUnique({
            where: {
                centreId_testId: {
                    centreId: centreId.data,
                    testId: parsedBody.data.testId,
                },
            },
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                error: "This test is already available at the centre",
            });
        }

        const centreTest = await db.centreTest.create({
            data: {
                centreId: centreId.data,
                testId: parsedBody.data.testId,
                price: parsedBody.data.price,
            },
            include: {
                centre: true,
                test: true,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Test added to centre successfully",
            centreTest,
        });
    } catch (error) {
        console.error("Add test to centre error:", error);
        return res.status(500).json({
            success: false,
            error: "Error adding test to centre",
        });
    }
};

export const removeTestFromCentre = async (req, res) => {
    const centreId = idSchema.safeParse(req.params.centreId);
    const testId = idSchema.safeParse(req.params.testId);

    if (!centreId.success || !testId.success) {
        return res.status(400).json({
            success: false,
            error: "Invalid centre or test ID",
        });
    }

    try {
        const centreTest = await db.centreTest.findUnique({
            where: {
                centreId_testId: {
                    centreId: centreId.data,
                    testId: testId.data,
                },
            },
        });

        if (!centreTest) {
            return res.status(404).json({
                success: false,
                error: "Test is not linked to this centre",
            });
        }

        const bookingCount = await db.booking.count({
            where: { centreTestId: centreTest.id },
        });

        if (bookingCount > 0) {
            return res.status(409).json({
                success: false,
                error: "Cannot remove a test that has existing bookings",
            });
        }

        await db.centreTest.delete({
            where: { id: centreTest.id },
        });

        return res.status(200).json({
            success: true,
            message: "Test removed from centre successfully",
        });
    } catch (error) {
        console.error("Remove test from centre error:", error);
        return res.status(500).json({
            success: false,
            error: "Error removing test from centre",
        });
    }
};
