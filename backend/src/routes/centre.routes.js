import express from "express";
import {
    createCentre,
    getAllCentres,
    getCentreById,
    updateCentre,
    deleteCentre,
    addTestToCentre,
    removeTestFromCentre,
} from "../controllers/centre.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const centreRoutes = express.Router();

centreRoutes.get("/", getAllCentres);
centreRoutes.get("/:id", getCentreById);

centreRoutes.post("/", authMiddleware, createCentre);
centreRoutes.patch("/:id", authMiddleware, updateCentre);
centreRoutes.delete("/:id", authMiddleware, deleteCentre);

centreRoutes.post("/:centreId/tests", authMiddleware, addTestToCentre);

centreRoutes.delete("/:centreId/tests/:testId", authMiddleware, removeTestFromCentre);

export default centreRoutes;
